import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, generateKeyPairSync } from 'node:crypto';
import type { DataSource, Repository } from 'typeorm';
import { UserRole } from '../../common/enums/user-role.enum';
import { UserStatus } from '../../common/enums/user-status.enum';
import type { AccessTokenPayload } from '../../common/interfaces/access-token-payload.interface';
import type { RefreshTokenPayload } from '../../common/interfaces/refresh-token-payload.interface';
import { User } from '../users/entities/user.entity';
import type { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { AuthSession } from './entities/auth-session.entity';
import { hash } from 'bcrypt';

describe('AuthService', () => {
  const keys = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const privateKey = keys.privateKey.export({ type: 'pkcs8', format: 'pem' });
  const publicKey = keys.publicKey.export({ type: 'spki', format: 'pem' });
  const user: User = {
    id: '8d164f76-6d3d-48b8-9de8-aa1e718d45ca',
    email: 'student@example.com',
    passwordHash: '',
    role: UserRole.STUDENT,
    status: UserStatus.ACTIVE,
    emailVerifiedAt: null,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const jwtService = new JwtService();
  let usersService: jest.Mocked<Pick<UsersService, 'findByEmail' | 'updateLastLogin' | 'create'>>;
  let sessionsRepository: jest.Mocked<Pick<Repository<AuthSession>, 'create' | 'save'>>;
  let dataSource: Pick<DataSource, 'transaction'>;
  let service: AuthService;

  beforeEach(() => {
    usersService = {
      findByEmail: jest.fn(),
      updateLastLogin: jest.fn().mockResolvedValue(undefined),
      create: jest.fn(),
    };
    sessionsRepository = {
      create: jest.fn((value) => value as AuthSession),
      save: jest.fn().mockImplementation((value) => Promise.resolve(value)),
    };
    dataSource = { transaction: jest.fn() };
    const values: Record<string, unknown> = {
      'jwt.privateKey': privateKey,
      'jwt.publicKey': publicKey,
      'jwt.accessExpiresIn': '15m',
      'jwt.refreshExpiresIn': '7d',
      'jwt.accessExpiresInSeconds': 900,
      'jwt.refreshExpiresInSeconds': 604800,
    };
    const configService = {
      getOrThrow: jest.fn((key: string) => values[key]),
    } as unknown as ConfigService;

    service = new AuthService(
      usersService as unknown as UsersService,
      jwtService,
      configService,
      dataSource as DataSource,
      sessionsRepository as unknown as Repository<AuthSession>,
    );
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
      (work: (manager: { getRepository: () => typeof transactionRepository }) => unknown) =>
        Promise.resolve(work({ getRepository: () => transactionRepository })),
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
    expect(secondRotation.refreshToken).toBeDefined();
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
});
