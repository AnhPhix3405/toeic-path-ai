import {
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { compare, hash } from 'bcrypt';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { AuthProvider } from '../../common/enums/auth-provider.enum';
import { UserStatus } from '../../common/enums/user-status.enum';
import { UserRole } from '../../common/enums/user-role.enum';
import type { AccessTokenPayload } from '../../common/interfaces/access-token-payload.interface';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import type { RefreshTokenPayload } from '../../common/interfaces/refresh-token-payload.interface';
import { User } from '../users/entities/user.entity';
import { UserProfile } from '../users/entities/user-profile.entity';
import { UsersService } from '../users/users.service';
import type { LoginDto } from './dto/request/login.dto';
import type { RegisterDto } from './dto/request/register.dto';
import type { RegisterResponseDto } from './dto/response/register-response.dto';
import { AuthSession } from './entities/auth-session.entity';
import type { ForgotPasswordDto } from './dto/request/forgot-password.dto';
import type { ResetPasswordDto } from './dto/request/reset-password.dto';
import type { ChangePasswordDto } from './dto/request/change-password.dto';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { MAIL_SERVICE, type MailService } from '../mail/mail.service';
import { SecurityEventService } from '../../common/security-events/security-event.service';
import { SecurityEventType } from '../../common/security-events/enums/security-event.enum';

export interface SessionMetadata {
  userAgent?: string;
  ipAddress?: string;
  traceId?: string;
}

export interface SafeUser {
  id: string;
  email: string;
  role: User['role'];
  status: User['status'];
}

export interface TokenResponse {
  user: SafeUser;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
}

export interface MessageResponse {
  message: string;
}

const FORGOT_PASSWORD_MESSAGE = 'If the email is registered, reset instructions will be sent.';
const RESET_PASSWORD_MESSAGE = 'Password has been reset successfully. Please sign in again.';
const CHANGE_PASSWORD_MESSAGE =
  'Password has been changed successfully. All active sessions have been terminated. Please log in again with your new password.';
const INVALID_RESET_TOKEN_MESSAGE = 'The password reset link is invalid or has expired.';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly privateKey: string;
  private readonly publicKey: string;
  private readonly accessExpiresIn: JwtSignOptions['expiresIn'];
  private readonly refreshExpiresIn: JwtSignOptions['expiresIn'];
  private readonly accessExpiresInSeconds: number;
  private readonly refreshExpiresInSeconds: number;
  private readonly saltRounds: number;
  private readonly termsVersion: string;
  private readonly passwordResetTtlMinutes: number;
  private readonly passwordResetUrl: string;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    @InjectRepository(AuthSession)
    private readonly sessionsRepository: Repository<AuthSession>,
    @Inject(MAIL_SERVICE) private readonly mailService: MailService,
    @Optional() private readonly securityEvents?: SecurityEventService,
  ) {
    this.privateKey = configService.getOrThrow<string>('jwt.privateKey');
    this.publicKey = configService.getOrThrow<string>('jwt.publicKey');
    this.accessExpiresIn =
      configService.getOrThrow<JwtSignOptions['expiresIn']>('jwt.accessExpiresIn');
    this.refreshExpiresIn =
      configService.getOrThrow<JwtSignOptions['expiresIn']>('jwt.refreshExpiresIn');
    this.accessExpiresInSeconds = configService.getOrThrow<number>('jwt.accessExpiresInSeconds');
    this.refreshExpiresInSeconds = configService.getOrThrow<number>('jwt.refreshExpiresInSeconds');
    this.saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? 12);
    this.termsVersion = configService.getOrThrow<string>('app.termsVersion');
    this.passwordResetTtlMinutes = configService.getOrThrow<number>(
      'passwordReset.tokenTtlMinutes',
    );
    this.passwordResetUrl = configService.getOrThrow<string>('passwordReset.url');
  }

  async forgotPassword(
    dto: ForgotPasswordDto,
    metadata: SessionMetadata = {},
  ): Promise<MessageResponse> {
    const emailFingerprint = this.securityEvents?.fingerprintEmail(dto.email);
    let user: User | null;
    try {
      user = await this.usersService.findByEmail(this.normalizeEmail(dto.email));
    } catch (error) {
      this.securityEvents?.error({
        event: SecurityEventType.AUTH_PASSWORD_RESET_FAILED,
        result: 'failure',
        module: 'auth',
        ...metadata,
        emailFingerprint,
        reasonCode: 'DATABASE_ERROR',
      });
      throw error;
    }
    if (!user || user.status !== UserStatus.ACTIVE) {
      this.securityEvents?.info({
        event: SecurityEventType.AUTH_PASSWORD_RESET_REQUESTED,
        result: 'success',
        module: 'auth',
        ...metadata,
        emailFingerprint,
      });
      return { message: FORGOT_PASSWORD_MESSAGE };
    }

    const rawToken = randomBytes(32).toString('base64url');
    const tokenHash = this.hashResetToken(rawToken);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.passwordResetTtlMinutes * 60_000);
    let tokenId: string;
    try {
      tokenId = await this.dataSource.transaction(async (manager) => {
        await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [user.id]);
        const tokens = manager.getRepository(PasswordResetToken);
        await tokens
          .createQueryBuilder()
          .update(PasswordResetToken)
          .set({ revokedAt: now })
          .where('user_id = :userId', { userId: user.id })
          .andWhere('used_at IS NULL')
          .andWhere('revoked_at IS NULL')
          .execute();
        const saved = await tokens.save(tokens.create({ userId: user.id, tokenHash, expiresAt }));
        return saved.id;
      });
    } catch (error) {
      this.securityEvents?.error({
        event: SecurityEventType.AUTH_PASSWORD_RESET_FAILED,
        result: 'failure',
        module: 'auth',
        ...metadata,
        userId: user.id,
        reasonCode: 'DATABASE_ERROR',
      });
      throw error;
    }

    const resetUrl = new URL(this.passwordResetUrl);
    resetUrl.searchParams.set('token', rawToken);
    try {
      await this.mailService.sendPasswordResetEmail({
        recipientEmail: user.email,
        resetUrl: resetUrl.toString(),
        expiresAt,
      });
    } catch {
      await this.revokeResetTokenAfterMailFailure(tokenId);
      this.securityEvents?.warn({
        event: SecurityEventType.AUTH_PASSWORD_RESET_FAILED,
        result: 'failure',
        module: 'auth',
        ...metadata,
        userId: user.id,
        reasonCode: 'MAIL_DELIVERY_FAILED',
      });
      return { message: FORGOT_PASSWORD_MESSAGE };
    }
    this.securityEvents?.info({
      event: SecurityEventType.AUTH_PASSWORD_RESET_REQUESTED,
      result: 'success',
      module: 'auth',
      ...metadata,
      userId: user.id,
    });
    return { message: FORGOT_PASSWORD_MESSAGE };
  }

  async resetPassword(
    dto: ResetPasswordDto,
    metadata: SessionMetadata = {},
  ): Promise<MessageResponse> {
    const tokenHash = this.hashResetToken(dto.token);
    const passwordHash = await hash(dto.newPassword, this.saltRounds);

    try {
      const outcome = await this.dataSource.transaction(async (manager) => {
        const tokens = manager.getRepository(PasswordResetToken);
        const resetToken = await tokens
          .createQueryBuilder('resetToken')
          .setLock('pessimistic_write')
          .innerJoinAndSelect('resetToken.user', 'user')
          .where('resetToken.tokenHash = :tokenHash', { tokenHash })
          .getOne();
        const now = new Date();
        if (
          !resetToken ||
          resetToken.usedAt ||
          resetToken.revokedAt ||
          resetToken.expiresAt <= now ||
          resetToken.user.status !== UserStatus.ACTIVE
        ) {
          throw new BadRequestException(INVALID_RESET_TOKEN_MESSAGE);
        }

        await manager.getRepository(User).update(resetToken.userId, { passwordHash });
        resetToken.usedAt = now;
        await tokens.save(resetToken);
        await tokens
          .createQueryBuilder()
          .update(PasswordResetToken)
          .set({ revokedAt: now })
          .where('user_id = :userId', { userId: resetToken.userId })
          .andWhere('id != :tokenId', { tokenId: resetToken.id })
          .andWhere('used_at IS NULL')
          .andWhere('revoked_at IS NULL')
          .execute();
        const revoked = await manager
          .getRepository(AuthSession)
          .createQueryBuilder()
          .update(AuthSession)
          .set({ revokedAt: now })
          .where('user_id = :userId', { userId: resetToken.userId })
          .andWhere('revoked_at IS NULL')
          .execute();
        return { userId: resetToken.userId, revokedSessionCount: revoked.affected ?? 0 };
      });
      this.securityEvents?.info({
        event: SecurityEventType.AUTH_PASSWORD_RESET_SUCCEEDED,
        result: 'success',
        module: 'auth',
        ...metadata,
        userId: outcome.userId,
        metadata: { revokedSessionCount: outcome.revokedSessionCount },
      });
    } catch (error) {
      this.securityEvents?.warn({
        event: SecurityEventType.AUTH_PASSWORD_RESET_FAILED,
        result: 'failure',
        module: 'auth',
        ...metadata,
        reasonCode: error instanceof BadRequestException ? 'RESET_TOKEN_INVALID' : 'DATABASE_ERROR',
      });
      throw error;
    }
    return { message: RESET_PASSWORD_MESSAGE };
  }

  async changePassword(
    user: AuthenticatedUser,
    dto: ChangePasswordDto,
    metadata: SessionMetadata = {},
  ): Promise<MessageResponse> {
    let existingUser: User | null;
    try {
      existingUser = await this.usersService.findById(user.id, true);
    } catch (error) {
      this.securityEvents?.error({
        event: SecurityEventType.AUTH_PASSWORD_CHANGE_FAILED,
        result: 'failure',
        module: 'auth',
        ...metadata,
        userId: user.id,
        reasonCode: 'DATABASE_ERROR',
      });
      throw error;
    }

    if (!existingUser || existingUser.status !== UserStatus.ACTIVE) {
      this.securityEvents?.warn({
        event: SecurityEventType.AUTH_PASSWORD_CHANGE_FAILED,
        result: 'failure',
        module: 'auth',
        ...metadata,
        userId: user.id,
        reasonCode: 'USER_INACTIVE',
      });
      throw new BadRequestException('User account is invalid or inactive');
    }

    if (existingUser.authProvider !== AuthProvider.LOCAL || !existingUser.passwordHash) {
      this.securityEvents?.warn({
        event: SecurityEventType.AUTH_PASSWORD_CHANGE_FAILED,
        result: 'failure',
        module: 'auth',
        ...metadata,
        userId: user.id,
        reasonCode: 'OAUTH_USER_NO_PASSWORD',
      });
      throw new BadRequestException('Account registered with Google cannot change password directly');
    }

    const isCurrentValid = await compare(dto.currentPassword, existingUser.passwordHash);
    if (!isCurrentValid) {
      this.securityEvents?.warn({
        event: SecurityEventType.AUTH_PASSWORD_CHANGE_FAILED,
        result: 'failure',
        module: 'auth',
        ...metadata,
        userId: user.id,
        reasonCode: 'INVALID_CURRENT_PASSWORD',
      });
      throw new BadRequestException('Current password is incorrect');
    }

    const isSamePassword = await compare(dto.newPassword, existingUser.passwordHash);
    if (isSamePassword) {
      this.securityEvents?.warn({
        event: SecurityEventType.AUTH_PASSWORD_CHANGE_FAILED,
        result: 'failure',
        module: 'auth',
        ...metadata,
        userId: user.id,
        reasonCode: 'SAME_AS_OLD_PASSWORD',
      });
      throw new BadRequestException('New password cannot be the same as your current password');
    }

    const passwordHash = await hash(dto.newPassword, this.saltRounds);

    try {
      const outcome = await this.dataSource.transaction(async (manager) => {
        await manager.getRepository(User).update(existingUser.id, { passwordHash });
        const revoked = await manager
          .getRepository(AuthSession)
          .createQueryBuilder()
          .update(AuthSession)
          .set({ revokedAt: new Date() })
          .where('user_id = :userId', { userId: existingUser.id })
          .andWhere('revoked_at IS NULL')
          .execute();
        return { revokedSessionCount: revoked.affected ?? 0 };
      });

      this.securityEvents?.info({
        event: SecurityEventType.AUTH_PASSWORD_CHANGED,
        result: 'success',
        module: 'auth',
        ...metadata,
        userId: existingUser.id,
        metadata: { revokedSessionCount: outcome.revokedSessionCount },
      });
    } catch (error) {
      this.securityEvents?.error({
        event: SecurityEventType.AUTH_PASSWORD_CHANGE_FAILED,
        result: 'failure',
        module: 'auth',
        ...metadata,
        userId: user.id,
        reasonCode: 'DATABASE_ERROR',
      });
      throw error;
    }

    return { message: CHANGE_PASSWORD_MESSAGE };
  }

  async register(dto: RegisterDto, metadata: SessionMetadata = {}): Promise<RegisterResponseDto> {
    const email = this.normalizeEmail(dto.email);
    let existingUser: User | null;
    try {
      existingUser = await this.usersService.findByEmail(email);
    } catch (error) {
      this.securityEvents?.error({
        event: SecurityEventType.AUTH_REGISTER_FAILED,
        result: 'failure',
        module: 'auth',
        ...metadata,
        reasonCode: 'DATABASE_ERROR',
      });
      throw error;
    }
    if (existingUser) {
      this.securityEvents?.warn({
        event: SecurityEventType.AUTH_REGISTER_FAILED,
        result: 'failure',
        module: 'auth',
        ...metadata,
        reasonCode: 'EMAIL_ALREADY_EXISTS',
      });
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await hash(dto.password, this.saltRounds);
    try {
      const result = await this.dataSource.transaction(async (manager) => {
        const users = manager.getRepository(User);
        const profiles = manager.getRepository(UserProfile);
        const user = await users.save(
          users.create({
            email,
            passwordHash,
            role: UserRole.STUDENT,
            status: UserStatus.ACTIVE,
            termsAcceptedAt: new Date(),
            termsVersion: this.termsVersion,
          }),
        );
        const profile = await profiles.save(
          profiles.create({
            userId: user.id,
            fullName: dto.fullName.trim(),
            avatarUrl: null,
            bio: null,
          }),
        );

        return {
          ...this.toSafeUser(user),
          profile: { fullName: profile.fullName, avatarUrl: profile.avatarUrl, bio: profile.bio },
          createdAt: user.createdAt,
        };
      });
      this.securityEvents?.info({
        event: SecurityEventType.AUTH_REGISTER_SUCCEEDED,
        result: 'success',
        module: 'auth',
        ...metadata,
        userId: result.id,
        role: result.role,
      });
      return result;
    } catch (error: unknown) {
      if (this.isUniqueViolation(error)) {
        this.securityEvents?.warn({
          event: SecurityEventType.AUTH_REGISTER_FAILED,
          result: 'failure',
          module: 'auth',
          ...metadata,
          reasonCode: 'EMAIL_ALREADY_EXISTS',
        });
        throw new ConflictException('Email is already registered');
      }
      this.securityEvents?.error({
        event: SecurityEventType.AUTH_REGISTER_FAILED,
        result: 'failure',
        module: 'auth',
        ...metadata,
        reasonCode: 'DATABASE_ERROR',
      });
      throw error;
    }
  }

  async login(dto: LoginDto, metadata: SessionMetadata): Promise<TokenResponse> {
    const startedAt = Date.now();
    let user: User | null;
    try {
      user = await this.usersService.findByEmail(this.normalizeEmail(dto.email), true);
    } catch (error) {
      this.securityEvents?.error({
        event: SecurityEventType.AUTH_LOGIN_FAILED,
        result: 'failure',
        module: 'auth',
        ...metadata,
        emailFingerprint: this.securityEvents.fingerprintEmail(dto.email),
        reasonCode: 'DATABASE_ERROR',
        durationMs: Date.now() - startedAt,
      });
      throw error;
    }

    if (!user || !user.passwordHash || !(await compare(dto.password, user.passwordHash))) {
      const sampleRate = this.configService.get<number>('securityEvents.loginFailureSampleRate', 1);
      if (Math.random() < sampleRate)
        this.securityEvents?.warn({
          event: SecurityEventType.AUTH_LOGIN_FAILED,
          result: 'failure',
          module: 'auth',
          ...metadata,
          userId: user?.id ?? null,
          emailFingerprint: user ? undefined : this.securityEvents.fingerprintEmail(dto.email),
          reasonCode: 'INVALID_CREDENTIALS',
          durationMs: Date.now() - startedAt,
        });
      throw new UnauthorizedException('Invalid email or password');
    }
    if (user.status === UserStatus.LOCKED) {
      this.securityEvents?.warn({
        event: SecurityEventType.AUTH_LOGIN_FAILED,
        result: 'blocked',
        module: 'auth',
        ...metadata,
        userId: user.id,
        reasonCode: 'ACCOUNT_LOCKED',
        durationMs: Date.now() - startedAt,
      });
      throw new ForbiddenException('Account is locked');
    }

    const sessionId = randomUUID();
    const tokens = await this.signTokenPair(user, sessionId);
    const now = new Date();
    const session = this.sessionsRepository.create({
      id: sessionId,
      userId: user.id,
      refreshTokenHash: this.hashRefreshToken(tokens.refreshToken),
      expiresAt: new Date(now.getTime() + this.refreshExpiresInSeconds * 1000),
      previousSessionId: null,
      userAgent: metadata.userAgent ?? null,
      ipAddress: metadata.ipAddress ?? null,
    });
    await this.sessionsRepository.save(session);
    await this.usersService.updateLastLogin(user.id, now);

    this.securityEvents?.info({
      event: SecurityEventType.AUTH_LOGIN_SUCCEEDED,
      result: 'success',
      module: 'auth',
      ...metadata,
      userId: user.id,
      role: user.role,
      sessionId,
      durationMs: Date.now() - startedAt,
    });

    return { ...tokens, user: this.toSafeUser(user) };
  }

  async issueSessionForUser(
    user: User,
    metadata: SessionMetadata = {},
    startedAt = Date.now(),
  ): Promise<TokenResponse> {
    if (user.status === UserStatus.LOCKED) {
      this.securityEvents?.warn({
        event: SecurityEventType.AUTH_LOGIN_FAILED,
        result: 'blocked',
        module: 'auth',
        ...metadata,
        userId: user.id,
        reasonCode: 'ACCOUNT_LOCKED',
        durationMs: Date.now() - startedAt,
      });
      throw new ForbiddenException('Account is locked');
    }

    const sessionId = randomUUID();
    const tokens = await this.signTokenPair(user, sessionId);
    const now = new Date();
    const session = this.sessionsRepository.create({
      id: sessionId,
      userId: user.id,
      refreshTokenHash: this.hashRefreshToken(tokens.refreshToken),
      expiresAt: new Date(now.getTime() + this.refreshExpiresInSeconds * 1000),
      previousSessionId: null,
      userAgent: metadata.userAgent ?? null,
      ipAddress: metadata.ipAddress ?? null,
    });
    await this.sessionsRepository.save(session);
    await this.usersService.updateLastLogin(user.id, now);

    this.securityEvents?.info({
      event: SecurityEventType.AUTH_LOGIN_SUCCEEDED,
      result: 'success',
      module: 'auth',
      ...metadata,
      userId: user.id,
      role: user.role,
      sessionId,
      durationMs: Date.now() - startedAt,
    });

    return { ...tokens, user: this.toSafeUser(user) };
  }

  async refresh(
    refreshToken: string | undefined,
    metadata: SessionMetadata,
  ): Promise<TokenResponse> {
    if (!refreshToken) {
      this.securityEvents?.warn({
        event: SecurityEventType.AUTH_REFRESH_FAILED,
        result: 'failure',
        module: 'auth',
        ...metadata,
        reasonCode: 'REFRESH_TOKEN_MISSING',
      });
      throw new UnauthorizedException('Refresh token cookie is required');
    }
    let payload: RefreshTokenPayload;
    try {
      payload = await this.verifyRefreshToken(refreshToken);
    } catch (error) {
      this.securityEvents?.warn({
        event: SecurityEventType.AUTH_REFRESH_FAILED,
        result: 'failure',
        module: 'auth',
        ...metadata,
        reasonCode: 'REFRESH_TOKEN_INVALID',
      });
      throw error;
    }

    const outcome = await this.dataSource.transaction(async (manager) => {
      const sessions = manager.getRepository(AuthSession);
      const oldSession = await sessions
        .createQueryBuilder('session')
        .setLock('pessimistic_write')
        .innerJoinAndSelect('session.user', 'user')
        .where('session.id = :sessionId', { sessionId: payload.sid })
        .andWhere('session.userId = :userId', { userId: payload.sub })
        .getOne();
      const now = new Date();

      if (!oldSession) return { kind: 'failure' as const, reasonCode: 'SESSION_NOT_FOUND' };
      if (oldSession.expiresAt <= now)
        return { kind: 'failure' as const, reasonCode: 'SESSION_EXPIRED' };
      if (
        oldSession.revokedAt ||
        this.hashRefreshToken(refreshToken) !== oldSession.refreshTokenHash
      ) {
        await this.revokeSessionFamily(manager, oldSession.id, oldSession.userId, now);
        return { kind: 'reuse' as const, userId: oldSession.userId, sessionId: oldSession.id };
      }
      if (oldSession.user.status === UserStatus.LOCKED) {
        return { kind: 'blocked' as const, userId: oldSession.userId, sessionId: oldSession.id };
      }

      const newSessionId = randomUUID();
      const tokens = await this.signTokenPair(oldSession.user, newSessionId);
      const newSession = sessions.create({
        id: newSessionId,
        userId: oldSession.userId,
        refreshTokenHash: this.hashRefreshToken(tokens.refreshToken),
        expiresAt: new Date(now.getTime() + this.refreshExpiresInSeconds * 1000),
        previousSessionId: oldSession.id,
        userAgent: metadata.userAgent ?? null,
        ipAddress: metadata.ipAddress ?? null,
      });

      oldSession.revokedAt = now;
      oldSession.lastUsedAt = now;
      await sessions.save([oldSession, newSession]);

      return {
        kind: 'success' as const,
        response: { ...tokens, user: this.toSafeUser(oldSession.user) },
        oldSessionId: oldSession.id,
        newSessionId,
      };
    });
    if (outcome.kind === 'reuse') {
      this.securityEvents?.warn({
        event: SecurityEventType.AUTH_REFRESH_REUSE_DETECTED,
        result: 'blocked',
        module: 'auth',
        ...metadata,
        userId: outcome.userId,
        sessionId: outcome.sessionId,
        reasonCode: 'TOKEN_REUSE_DETECTED',
      });
      throw new UnauthorizedException('Refresh session is not valid');
    }
    if (outcome.kind === 'blocked') {
      this.securityEvents?.warn({
        event: SecurityEventType.AUTH_REFRESH_FAILED,
        result: 'blocked',
        module: 'auth',
        ...metadata,
        userId: outcome.userId,
        sessionId: outcome.sessionId,
        reasonCode: 'ACCOUNT_LOCKED',
      });
      throw new ForbiddenException('Account is locked');
    }
    if (outcome.kind === 'failure') {
      this.securityEvents?.warn({
        event: SecurityEventType.AUTH_REFRESH_FAILED,
        result: 'failure',
        module: 'auth',
        ...metadata,
        userId: payload.sub,
        sessionId: payload.sid,
        reasonCode: outcome.reasonCode,
      });
      throw new UnauthorizedException('Refresh session is not valid');
    }
    this.securityEvents?.info({
      event: SecurityEventType.AUTH_REFRESH_SUCCEEDED,
      result: 'success',
      module: 'auth',
      ...metadata,
      userId: outcome.response.user.id,
      sessionId: outcome.newSessionId,
      metadata: { oldSessionId: outcome.oldSessionId, newSessionId: outcome.newSessionId },
    });
    return outcome.response;
  }

  async revoke(user: AuthenticatedUser, metadata: SessionMetadata = {}): Promise<void> {
    try {
      const result = await this.sessionsRepository
        .createQueryBuilder()
        .update(AuthSession)
        .set({ revokedAt: new Date() })
        .where('id = :sessionId', { sessionId: user.sessionId })
        .andWhere('user_id = :userId', { userId: user.id })
        .andWhere('revoked_at IS NULL')
        .execute();
      this.securityEvents?.info({
        event: SecurityEventType.AUTH_LOGOUT_SUCCEEDED,
        result: 'success',
        module: 'auth',
        ...metadata,
        userId: user.id,
        sessionId: user.sessionId,
        metadata: {
          sessionRevoked: (result.affected ?? 0) > 0,
          alreadyRevoked: (result.affected ?? 0) === 0,
        },
      });
    } catch (error) {
      this.securityEvents?.warn({
        event: SecurityEventType.AUTH_LOGOUT_FAILED,
        result: 'failure',
        module: 'auth',
        ...metadata,
        userId: user.id,
        sessionId: user.sessionId,
        reasonCode: 'DATABASE_ERROR',
      });
      throw error;
    }
  }

  private async signTokenPair(user: User, sessionId: string): Promise<Omit<TokenResponse, 'user'>> {
    const accessPayload: AccessTokenPayload = {
      sub: user.id,
      sid: sessionId,
      email: user.email,
      role: user.role,
      type: 'access',
    };
    const refreshPayload: RefreshTokenPayload = {
      sub: user.id,
      sid: sessionId,
      type: 'refresh',
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        privateKey: this.privateKey,
        algorithm: 'RS256',
        expiresIn: this.accessExpiresIn,
      }),
      this.jwtService.signAsync(refreshPayload, {
        privateKey: this.privateKey,
        algorithm: 'RS256',
        expiresIn: this.refreshExpiresIn,
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresIn: this.accessExpiresInSeconds,
    };
  }

  private async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(token, {
        publicKey: this.publicKey,
        algorithms: ['RS256'],
      });
      if (payload.type !== 'refresh' || !payload.sub || !payload.sid) {
        throw new UnauthorizedException('Invalid refresh token');
      }
      return payload;
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  private hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private hashResetToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async revokeSessionFamily(
    manager: EntityManager,
    sessionId: string,
    userId: string,
    revokedAt: Date,
  ): Promise<void> {
    await manager.query(
      `WITH RECURSIVE family AS (
         SELECT id, previous_session_id FROM auth_sessions WHERE id = $1 AND user_id = $2
         UNION
         SELECT session.id, session.previous_session_id
         FROM auth_sessions session
         JOIN family member
           ON session.id = member.previous_session_id OR session.previous_session_id = member.id
         WHERE session.user_id = $2
       )
       UPDATE auth_sessions SET revoked_at = COALESCE(revoked_at, $3)
       WHERE id IN (SELECT id FROM family)`,
      [sessionId, userId, revokedAt],
    );
  }

  private async revokeResetTokenAfterMailFailure(tokenId: string): Promise<void> {
    try {
      await this.dataSource
        .getRepository(PasswordResetToken)
        .update({ id: tokenId }, { revokedAt: new Date() });
    } catch {
      this.logger.error('Failed to revoke undelivered password reset token');
    }
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private toSafeUser(user: User): SafeUser {
    return { id: user.id, email: user.email, role: user.role, status: user.status };
  }

  private isUniqueViolation(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
  }
}
