import {
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { compare, hash } from 'bcrypt';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { DataSource, Repository } from 'typeorm';
import { UserStatus } from '../../common/enums/user-status.enum';
import { UserRole } from '../../common/enums/user-role.enum';
import type { AccessTokenPayload } from '../../common/interfaces/access-token-payload.interface';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import type { RefreshTokenPayload } from '../../common/interfaces/refresh-token-payload.interface';
import { User } from '../users/entities/user.entity';
import { UserProfile } from '../users/entities/user-profile.entity';
import { UsersService } from '../users/users.service';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import type { RegisterResponseDto } from './dto/register-response.dto';
import { AuthSession } from './entities/auth-session.entity';
import type { ForgotPasswordDto } from './dto/forgot-password.dto';
import type { ResetPasswordDto } from './dto/reset-password.dto';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { MAIL_SERVICE, type MailService } from '../mail/mail.service';

interface SessionMetadata {
  userAgent?: string;
  ipAddress?: string;
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

  async forgotPassword(dto: ForgotPasswordDto): Promise<MessageResponse> {
    const user = await this.usersService.findByEmail(this.normalizeEmail(dto.email));
    if (!user || user.status !== UserStatus.ACTIVE) {
      return { message: FORGOT_PASSWORD_MESSAGE };
    }

    const rawToken = randomBytes(32).toString('base64url');
    const tokenHash = this.hashResetToken(rawToken);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.passwordResetTtlMinutes * 60_000);
    const tokenId = await this.dataSource.transaction(async (manager) => {
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
      this.logger.error('Password reset email delivery failed', { userId: user.id });
    }
    return { message: FORGOT_PASSWORD_MESSAGE };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<MessageResponse> {
    const tokenHash = this.hashResetToken(dto.token);
    const passwordHash = await hash(dto.newPassword, this.saltRounds);

    await this.dataSource.transaction(async (manager) => {
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
      await manager
        .getRepository(AuthSession)
        .createQueryBuilder()
        .update(AuthSession)
        .set({ revokedAt: now })
        .where('user_id = :userId', { userId: resetToken.userId })
        .andWhere('revoked_at IS NULL')
        .execute();
    });
    return { message: RESET_PASSWORD_MESSAGE };
  }

  async register(dto: RegisterDto): Promise<RegisterResponseDto> {
    const email = this.normalizeEmail(dto.email);
    if (await this.usersService.findByEmail(email)) {
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await hash(dto.password, this.saltRounds);
    try {
      return await this.dataSource.transaction(async (manager) => {
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
    } catch (error: unknown) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('Email is already registered');
      }
      throw error;
    }
  }

  async login(dto: LoginDto, metadata: SessionMetadata): Promise<TokenResponse> {
    const user = await this.usersService.findByEmail(this.normalizeEmail(dto.email), true);

    if (!user || !(await compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (user.status === UserStatus.LOCKED) {
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

    return { ...tokens, user: this.toSafeUser(user) };
  }

  async refresh(refreshToken: string, metadata: SessionMetadata): Promise<TokenResponse> {
    const payload = await this.verifyRefreshToken(refreshToken);

    return this.dataSource.transaction(async (manager) => {
      const sessions = manager.getRepository(AuthSession);
      const oldSession = await sessions
        .createQueryBuilder('session')
        .setLock('pessimistic_write')
        .innerJoinAndSelect('session.user', 'user')
        .where('session.id = :sessionId', { sessionId: payload.sid })
        .andWhere('session.userId = :userId', { userId: payload.sub })
        .getOne();
      const now = new Date();

      if (
        !oldSession ||
        oldSession.revokedAt ||
        oldSession.expiresAt <= now ||
        this.hashRefreshToken(refreshToken) !== oldSession.refreshTokenHash
      ) {
        throw new UnauthorizedException('Refresh session is not valid');
      }
      if (oldSession.user.status === UserStatus.LOCKED) {
        throw new ForbiddenException('Account is locked');
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

      return { ...tokens, user: this.toSafeUser(oldSession.user) };
    });
  }

  async revoke(user: AuthenticatedUser): Promise<void> {
    await this.sessionsRepository
      .createQueryBuilder()
      .update(AuthSession)
      .set({ revokedAt: new Date() })
      .where('id = :sessionId', { sessionId: user.sessionId })
      .andWhere('user_id = :userId', { userId: user.id })
      .andWhere('revoked_at IS NULL')
      .execute();
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
