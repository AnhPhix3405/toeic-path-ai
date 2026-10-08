import { BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, generateKeyPairSync } from 'node:crypto';
import type { DataSource, Repository } from 'typeorm';
import { AuthProvider } from '../../common/enums/auth-provider.enum';
import { UserRole } from '../../common/enums/user-role.enum';
import { UserStatus } from '../../common/enums/user-status.enum';
import type { AccessTokenPayload } from '../../common/interfaces/access-token-payload.interface';
import type { RefreshTokenPayload } from '../../common/interfaces/refresh-token-payload.interface';
import { User } from '../users/entities/user.entity';
import type { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { AuthSession } from './entities/auth-session.entity';
import { compare, hash } from 'bcrypt';
import { UserProfile } from '../users/entities/user-profile.entity';
import type { SecurityEventService } from '../../common/security-events/security-event.service';
import { SecurityEventType } from '../../common/security-events/enums/security-event.enum';

describe('AuthService', () => {
  const keys = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const privateKey = keys.privateKey.export({ type: 'pkcs8', format: 'pem' });
  const publicKey = keys.publicKey.export({ type: 'spki', format: 'pem' });
  const user: User = {
    id: '8d164f76-6d3d-48b8-9de8-aa1e718d45ca',
    email: 'student@example.com',
    passwordHash: '',
    authProvider: AuthProvider.LOCAL,
    providerId: null,
    role: UserRole.STUDENT,
    status: UserStatus.ACTIVE,
    emailVerifiedAt: null,
    lastLoginAt: null,
    termsAcceptedAt: null,
    termsVersion: null,
    profile: undefined as unknown as UserProfile,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const jwtService = new JwtService();
  let usersService: jest.Mocked<
    Pick<UsersService, 'findByEmail' | 'findById' | 'updateLastLogin' | 'create'>
  >;
  let sessionsRepository: jest.Mocked<Pick<Repository<AuthSession>, 'create' | 'save'>>;
  let dataSource: Pick<DataSource, 'transaction'>;
  let service: AuthService;
  let securityEvents: jest.Mocked<
    Pick<SecurityEventService, 'info' | 'warn' | 'error' | 'fingerprintEmail'>
  >;

  beforeEach(() => {
    usersService = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      updateLastLogin: jest.fn().mockResolvedValue(undefined),
      create: jest.fn(),
    };
    sessionsRepository = {
      create: jest.fn((value) => value as AuthSession),
      save: jest.fn().mockImplementation((value) => Promise.resolve(value)),
    };
    dataSource = { transaction: jest.fn() };
    securityEvents = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      fingerprintEmail: jest.fn().mockReturnValue('email-hmac'),
    };
    const values: Record<string, unknown> = {
      'jwt.privateKey': privateKey,
      'jwt.publicKey': publicKey,
      'jwt.accessExpiresIn': '15m',
      'jwt.refreshExpiresIn': '7d',
      'jwt.accessExpiresInSeconds': 900,
      'jwt.refreshExpiresInSeconds': 604800,
      'app.termsVersion': '2026-08-31',
      'passwordReset.tokenTtlMinutes': 30,
      'passwordReset.url': 'http://localhost:3000/reset-password',
    };
    const configService = {
      getOrThrow: jest.fn((key: string) => values[key]),
      get: jest.fn((key: string, fallback: unknown) => values[key] ?? fallback),
    } as unknown as ConfigService;

    service = new AuthService(
      usersService as unknown as UsersService,
      jwtService,
      configService,
      dataSource as DataSource,
      sessionsRepository as unknown as Repository<AuthSession>,
      { sendPasswordResetEmail: jest.fn() },
      securityEvents as unknown as SecurityEventService,
    );
  });

  it('creates an active Student and profile atomically with normalized input', async () => {
    usersService.findByEmail.mockResolvedValue(null);
    const usersRepository = {
      create: jest.fn((value: Partial<User>) => ({
        ...user,
        ...value,
        createdAt: new Date('2026-08-31T00:00:00.000Z'),
      })),
      save: jest.fn((value: User) => Promise.resolve(value)),
    };
    const profilesRepository = {
      create: jest.fn((value: Partial<UserProfile>) => value as UserProfile),
      save: jest.fn((value: UserProfile) => Promise.resolve(value)),
    };
    (dataSource.transaction as jest.Mock).mockImplementation(
      (work: (manager: { getRepository: (entity: unknown) => unknown }) => unknown) =>
        Promise.resolve(
          work({
            getRepository: (entity: unknown) =>
              entity === User ? usersRepository : profilesRepository,
          }),
        ),
    );

    const result = await service.register({
      fullName: ' Nguyen Van A ',
      email: ' Student@Example.com ',
      password: 'StrongPassword123!',
      confirmPassword: 'StrongPassword123!',
      acceptTerms: true,
    });

    expect(usersRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'student@example.com',
        role: UserRole.STUDENT,
        status: UserStatus.ACTIVE,
        termsVersion: '2026-08-31',
      }),
    );
    const createdUser = usersRepository.create.mock.calls[0][0];
    expect(createdUser.termsAcceptedAt).toBeInstanceOf(Date);
    await expect(compare('StrongPassword123!', createdUser.passwordHash!)).resolves.toBe(true);
    expect(profilesRepository.create).toHaveBeenCalledWith({
      userId: user.id,
      fullName: 'Nguyen Van A',
      avatarUrl: null,
      bio: null,
    });
    expect(result).not.toHaveProperty('passwordHash');
    expect(result.profile).toEqual({ fullName: 'Nguyen Van A', avatarUrl: null, bio: null });
    expect(securityEvents.info).toHaveBeenCalledWith(
      expect.objectContaining({
        event: SecurityEventType.AUTH_REGISTER_SUCCEEDED,
        userId: user.id,
      }),
    );
  });

  it('maps a transaction unique violation to conflict', async () => {
    usersService.findByEmail.mockResolvedValue(null);
    (dataSource.transaction as jest.Mock).mockRejectedValue({ code: '23505' });

    await expect(
      service.register({
        fullName: 'Student',
        email: 'student@example.com',
        password: 'StrongPassword123!',
        confirmPassword: 'StrongPassword123!',
        acceptTerms: true,
      }),
    ).rejects.toMatchObject({ status: 409 });
    expect(securityEvents.info).not.toHaveBeenCalled();
  });

  it('issues RS256 access and refresh tokens and stores only the refresh hash', async () => {
    user.passwordHash = await hash('StrongPassword123!', 10);
    usersService.findByEmail.mockResolvedValue(user);

    const result = await service.login(
      { email: ' Student@Example.com ', password: 'StrongPassword123!' },
      { userAgent: 'jest', ipAddress: '127.0.0.1' },
    );
    const access = jwtService.verify<AccessTokenPayload>(result.accessToken, {
      publicKey,
      algorithms: ['RS256'],
    });
    const refresh = jwtService.verify<RefreshTokenPayload>(result.refreshToken, {
      publicKey,
      algorithms: ['RS256'],
    });

    expect(access).toMatchObject({ sub: user.id, type: 'access' });
    expect(refresh).toMatchObject({ sub: user.id, type: 'refresh' });
    const createdSession = sessionsRepository.create.mock.calls[0][0] as AuthSession;
    expect(createdSession.id).toBe(refresh.sid);
    expect(createdSession.previousSessionId).toBeNull();
    expect(createdSession.refreshTokenHash).not.toContain(result.refreshToken);
    expect(usersService.findByEmail).toHaveBeenCalledWith('student@example.com', true);
    expect(securityEvents.info).toHaveBeenCalledWith(
      expect.objectContaining({
        event: SecurityEventType.AUTH_LOGIN_SUCCEEDED,
        userId: user.id,
        sessionId: refresh.sid,
      }),
    );
  });

  it('builds a previous-session chain while revoking every rotated session', async () => {
    const initialSessionId = '10000000-0000-4000-8000-000000000001';
    const initialRefreshToken = await jwtService.signAsync(
      { sub: user.id, sid: initialSessionId, type: 'refresh' },
      { privateKey, algorithm: 'RS256', expiresIn: '7d' },
    );
    const initialSession = {
      id: initialSessionId,
      userId: user.id,
      user,
      refreshTokenHash: createHash('sha256').update(initialRefreshToken).digest('hex'),
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      previousSessionId: null,
      previousSession: null,
      userAgent: null,
      ipAddress: null,
      lastUsedAt: null,
      createdAt: new Date(),
    } satisfies AuthSession;
    const sessionsToLoad: AuthSession[] = [initialSession];
    const createdSessions: AuthSession[] = [];
    const transactionRepository = {
      create: jest.fn((value: Partial<AuthSession>) => value as AuthSession),
      save: jest.fn((sessions: AuthSession[]) => {
        sessions[1].user = user;
        createdSessions.push(sessions[1]);
        sessionsToLoad.push(sessions[1]);
        return Promise.resolve(sessions);
      }),
      createQueryBuilder: jest.fn(() => ({
        setLock: jest.fn().mockReturnThis(),
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn(() => Promise.resolve(sessionsToLoad.shift() ?? null)),
      })),
    };
    (dataSource.transaction as jest.Mock).mockImplementation(
      (
        work: (manager: {
          getRepository: () => typeof transactionRepository;
          query: jest.Mock;
        }) => unknown,
      ) => Promise.resolve(work({ getRepository: () => transactionRepository, query: jest.fn() })),
    );

    const firstRotation = await service.refresh(initialRefreshToken, {});
    const secondRotation = await service.refresh(firstRotation.refreshToken, {});

    expect(createdSessions).toHaveLength(2);
    expect(createdSessions[0].previousSessionId).toBe(initialSession.id);
    expect(createdSessions[1].previousSessionId).toBe(createdSessions[0].id);
    expect(initialSession.revokedAt).toBeInstanceOf(Date);
    expect(createdSessions[0].revokedAt).toBeInstanceOf(Date);

    sessionsToLoad.push(initialSession);
    await expect(service.refresh(initialRefreshToken, {})).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(securityEvents.warn).toHaveBeenCalledWith(
      expect.objectContaining({ event: SecurityEventType.AUTH_REFRESH_REUSE_DETECTED }),
    );
    expect(secondRotation.refreshToken).toBeDefined();
  });

  it('records a missing refresh token without logging a token value', async () => {
    await expect(service.refresh(undefined, { traceId: 'trace-1' })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(securityEvents.warn).toHaveBeenCalledWith({
      event: SecurityEventType.AUTH_REFRESH_FAILED,
      result: 'failure',
      module: 'auth',
      traceId: 'trace-1',
      reasonCode: 'REFRESH_TOKEN_MISSING',
    });
  });

  it('rejects tokens signed with HS256 or another RSA private key', async () => {
    const hsToken = jwtService.sign(
      { sub: user.id, sid: 'session', type: 'refresh' },
      { secret: 'a-secret-that-is-at-least-32-characters', algorithm: 'HS256' },
    );
    const otherKeys = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const wrongToken = jwtService.sign(
      { sub: user.id, sid: 'session', type: 'refresh' },
      {
        privateKey: otherKeys.privateKey.export({ type: 'pkcs8', format: 'pem' }),
        algorithm: 'RS256',
      },
    );

    await expect(service.refresh(hsToken, {})).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(service.refresh(wrongToken, {})).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a locked account after valid password verification', async () => {
    user.passwordHash = await hash('StrongPassword123!', 10);
    user.status = UserStatus.LOCKED;
    usersService.findByEmail.mockResolvedValue(user);

    await expect(
      service.login({ email: user.email, password: 'StrongPassword123!' }, {}),
    ).rejects.toBeInstanceOf(ForbiddenException);
    user.status = UserStatus.ACTIVE;
  });

  describe('changePassword', () => {
    it('changes password successfully, revokes 100% auth_sessions and logs AUTH_PASSWORD_CHANGED', async () => {
      const currentPassword = 'CurrentPassword123!';
      const newPassword = 'NewSecurePassword456!@';
      const initialHash = await hash(currentPassword, 10);
      const testUser: User = {
        ...user,
        passwordHash: initialHash,
        authProvider: AuthProvider.LOCAL,
      };
      usersService.findById.mockResolvedValue(testUser);

      const usersRepo = {
        update: jest.fn().mockResolvedValue({ affected: 1 }),
      };
      const sessionBuilder = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 3 }),
      };
      (dataSource.transaction as jest.Mock).mockImplementation(
        (work: (manager: { getRepository: (entity: unknown) => unknown }) => unknown) =>
          Promise.resolve(
            work({
              getRepository: (entity: unknown) =>
                entity === User ? usersRepo : { createQueryBuilder: () => sessionBuilder },
            }),
          ),
      );

      const result = await service.changePassword(
        { id: user.id, email: user.email, role: user.role, sessionId: 's-1' },
        { currentPassword, newPassword, confirmNewPassword: newPassword },
        { traceId: 'trace-cp-1', ipAddress: '127.0.0.1' },
      );

      expect(usersService.findById).toHaveBeenCalledWith(user.id, true);
      expect(usersRepo.update).toHaveBeenCalledWith(user.id, {
        passwordHash: expect.any(String),
      });
      const updatedHash = usersRepo.update.mock.calls[0][1].passwordHash;
      await expect(compare(newPassword, updatedHash)).resolves.toBe(true);

      expect(sessionBuilder.where).toHaveBeenCalledWith('user_id = :userId', { userId: user.id });
      expect(sessionBuilder.andWhere).toHaveBeenCalledWith('revoked_at IS NULL');
      expect(result.message).toContain('Password has been changed successfully');

      expect(securityEvents.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: SecurityEventType.AUTH_PASSWORD_CHANGED,
          result: 'success',
          userId: user.id,
          traceId: 'trace-cp-1',
          metadata: { revokedSessionCount: 3 },
        }),
      );
    });

    it('rejects when current password is incorrect and logs AUTH_PASSWORD_CHANGE_FAILED', async () => {
      const initialHash = await hash('CorrectPassword123!', 10);
      const testUser: User = {
        ...user,
        passwordHash: initialHash,
        authProvider: AuthProvider.LOCAL,
      };
      usersService.findById.mockResolvedValue(testUser);

      await expect(
        service.changePassword(
          { id: user.id, email: user.email, role: user.role, sessionId: 's-1' },
          {
            currentPassword: 'WrongPassword123!',
            newPassword: 'NewSecurePassword456!@',
            confirmNewPassword: 'NewSecurePassword456!@',
          },
          { traceId: 'trace-cp-2' },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(securityEvents.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          event: SecurityEventType.AUTH_PASSWORD_CHANGE_FAILED,
          result: 'failure',
          reasonCode: 'INVALID_CURRENT_PASSWORD',
          traceId: 'trace-cp-2',
        }),
      );
    });

    it('rejects when new password is same as current password (verified via bcrypt) and logs event', async () => {
      const currentPassword = 'CurrentPassword123!';
      const initialHash = await hash(currentPassword, 10);
      const testUser: User = {
        ...user,
        passwordHash: initialHash,
        authProvider: AuthProvider.LOCAL,
      };
      usersService.findById.mockResolvedValue(testUser);

      await expect(
        service.changePassword(
          { id: user.id, email: user.email, role: user.role, sessionId: 's-1' },
          {
            currentPassword,
            newPassword: currentPassword,
            confirmNewPassword: currentPassword,
          },
          { traceId: 'trace-cp-3' },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(securityEvents.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          event: SecurityEventType.AUTH_PASSWORD_CHANGE_FAILED,
          result: 'failure',
          reasonCode: 'SAME_AS_OLD_PASSWORD',
          traceId: 'trace-cp-3',
        }),
      );
    });

    it('rejects OAuth account without password and logs event', async () => {
      const testUser: User = {
        ...user,
        passwordHash: null,
        authProvider: AuthProvider.GOOGLE,
      };
      usersService.findById.mockResolvedValue(testUser);

      await expect(
        service.changePassword(
          { id: user.id, email: user.email, role: user.role, sessionId: 's-1' },
          {
            currentPassword: 'SomePassword123!',
            newPassword: 'NewSecurePassword456!@',
            confirmNewPassword: 'NewSecurePassword456!@',
          },
          { traceId: 'trace-cp-4' },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(securityEvents.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          event: SecurityEventType.AUTH_PASSWORD_CHANGE_FAILED,
          result: 'failure',
          reasonCode: 'OAUTH_USER_NO_PASSWORD',
          traceId: 'trace-cp-4',
        }),
      );
    });

    it('rejects inactive or not found user and logs event', async () => {
      usersService.findById.mockResolvedValue(null);

      await expect(
        service.changePassword(
          { id: user.id, email: user.email, role: user.role, sessionId: 's-1' },
          {
            currentPassword: 'SomePassword123!',
            newPassword: 'NewSecurePassword456!@',
            confirmNewPassword: 'NewSecurePassword456!@',
          },
          { traceId: 'trace-cp-5' },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(securityEvents.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          event: SecurityEventType.AUTH_PASSWORD_CHANGE_FAILED,
          result: 'failure',
          reasonCode: 'USER_INACTIVE',
          traceId: 'trace-cp-5',
        }),
      );
    });
  });
});
