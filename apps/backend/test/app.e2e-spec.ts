import {
  BadRequestException,
  INestApplication,
  type ExecutionContext,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types';
import { UserRole } from '../src/common/enums/user-role.enum';
import { UserStatus } from '../src/common/enums/user-status.enum';
import type { AuthenticatedUser } from '../src/common/interfaces/authenticated-user.interface';
import { AuthController } from '../src/modules/auth/auth.controller';
import { AuthService, type TokenResponse } from '../src/modules/auth/auth.service';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { ProfileController } from '../src/modules/profile/profile.controller';
import { ProfileService } from '../src/modules/profile/profile.service';
import { Gender } from '../src/common/enums/gender.enum';

describe('Auth refresh cookie (e2e)', () => {
  let app: INestApplication<App>;
  const authService = {
    register: jest.fn(),
    login: jest.fn(),
    refresh: jest.fn(),
    revoke: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
  };
  const tokenResponse: TokenResponse = {
    user: {
      id: 'user-id',
      email: 'student@example.com',
      role: UserRole.STUDENT,
      status: UserStatus.ACTIVE,
    },
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    accessTokenExpiresIn: 900,
  };

  beforeAll(async () => {
    const values: Record<string, unknown> = {
      'refreshCookie.name': 'toeic_refresh_token',
      'refreshCookie.secure': false,
      'refreshCookie.sameSite': 'lax',
      'refreshCookie.path': '/api/v1/auth',
      'refreshCookie.maxAge': 604800000,
    };
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        {
          provide: ConfigService,
          useValue: { getOrThrow: (key: string) => values[key] },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(context: ExecutionContext): boolean {
          const authenticatedUser: AuthenticatedUser = {
            id: 'user-id',
            sessionId: 'session-id',
            email: 'student@example.com',
            role: UserRole.STUDENT,
            status: UserStatus.ACTIVE,
          };
          const httpRequest = context.switchToHttp().getRequest<{
            user: AuthenticatedUser;
          }>();
          httpRequest.user = authenticatedUser;
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.use(cookieParser());
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    authService.login.mockResolvedValue(tokenResponse);
    authService.register.mockResolvedValue({
      ...tokenResponse.user,
      profile: { fullName: 'Nguyen Van A', avatarUrl: null, bio: null },
      createdAt: new Date('2026-08-31T00:00:00.000Z'),
    });
    authService.refresh.mockResolvedValue({
      ...tokenResponse,
      accessToken: 'rotated-access-token',
      refreshToken: 'rotated-refresh-token',
    });
    authService.revoke.mockResolvedValue(undefined);
    authService.forgotPassword.mockResolvedValue({
      message: 'If the email is registered, reset instructions will be sent.',
    });
    authService.resetPassword.mockResolvedValue({
      message: 'Password has been reset successfully. Please sign in again.',
    });
  });

  it('registers a Student profile and rejects client-controlled role', async () => {
    const payload = {
      fullName: ' Nguyen Van A ',
      email: ' Student@Example.com ',
      password: 'StrongPassword123!',
      confirmPassword: 'StrongPassword123!',
      acceptTerms: true,
    };
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(payload)
      .expect(201);

    expect(authService.register).toHaveBeenCalledWith({
      ...payload,
      fullName: 'Nguyen Van A',
      email: 'student@example.com',
    });
    expect(response.body).not.toHaveProperty('passwordHash');
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ ...payload, role: UserRole.ADMIN })
      .expect(400);
  });

  it('keeps forgot-password enumeration-safe and clears the cookie after reset', async () => {
    const forgot = await request(app.getHttpServer())
      .post('/api/v1/auth/forgot-password')
      .send({ email: ' Unknown@Example.com ' })
      .expect(200);
    expect(forgot.body).toEqual({
      message: 'If the email is registered, reset instructions will be sent.',
    });
    expect(authService.forgotPassword).toHaveBeenCalledWith({ email: 'unknown@example.com' });

    const reset = await request(app.getHttpServer())
      .post('/api/v1/auth/reset-password')
      .send({
        token: 'opaque-token',
        newPassword: 'NewPassword123!',
        confirmPassword: 'NewPassword123!',
      })
      .expect(200);
    expect(reset.headers['set-cookie']?.[0]).toContain('toeic_refresh_token=');
    expect(reset.body).not.toHaveProperty('token');
  });

  afterAll(async () => {
    await app.close();
  });

  it('sets and rotates the HTTP-only cookie without exposing refresh tokens', async () => {
    const agent = request.agent(app.getHttpServer());
    const loginResponse = await agent
      .post('/api/v1/auth/login')
      .send({ email: 'student@example.com', password: 'StrongPassword123!' })
      .expect(200);

    expect(loginResponse.body).toEqual({
      user: tokenResponse.user,
      accessToken: 'access-token',
      accessTokenExpiresIn: 900,
    });
    expect(loginResponse.headers['set-cookie']?.[0]).toContain('toeic_refresh_token=refresh-token');
    expect(loginResponse.headers['set-cookie']?.[0]).toContain('HttpOnly');
    expect(loginResponse.headers['set-cookie']?.[0]).toContain('Path=/api/v1/auth');

    const refreshResponse = await agent.post('/api/v1/auth/refresh').expect(200);
    expect(authService.refresh).toHaveBeenCalledWith('refresh-token', expect.any(Object));
    expect(refreshResponse.body).toEqual({
      accessToken: 'rotated-access-token',
      accessTokenExpiresIn: 900,
    });
    expect(refreshResponse.headers['set-cookie']?.[0]).toContain(
      'toeic_refresh_token=rotated-refresh-token',
    );
  });

  it('returns 401 and expires the cookie when refresh cookie is absent', async () => {
    const response = await request(app.getHttpServer()).post('/api/v1/auth/refresh').expect(401);

    expect(response.headers['set-cookie']?.[0]).toContain('toeic_refresh_token=');
  });

  it('revokes the session and clears the cookie on logout', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Authorization', 'Bearer access-token')
      .expect(204);

    expect(authService.revoke).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: 'session-id' }),
    );
    expect(response.headers['set-cookie']?.[0]).toContain('toeic_refresh_token=');
  });
});

describe('My profile (e2e)', () => {
  let app: INestApplication<App>;
  let currentRole = UserRole.STUDENT;
  const profileResponse = {
    userId: '20000000-0000-4000-8000-000000000002',
    email: 'student@example.com',
    role: UserRole.STUDENT,
    profile: {
      fullName: 'Student',
      avatarUrl: 'https://example.com/avatar.png',
      birthday: null,
      gender: null,
      bio: null,
    },
    updatedAt: new Date('2026-09-02T08:00:00.000Z'),
  };
  const profileService = {
    getMyProfile: jest.fn().mockResolvedValue(profileResponse),
    updateMyProfile: jest.fn().mockImplementation((_userId: string, dto: object) => {
      if (Object.keys(dto).length === 0) {
        throw new BadRequestException('At least one profile field is required');
      }
      return Promise.resolve(profileResponse);
    }),
  };

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      controllers: [ProfileController],
      providers: [{ provide: ProfileService, useValue: profileService }, JwtAuthGuard, RolesGuard],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(context: ExecutionContext): boolean {
          const httpRequest = context.switchToHttp().getRequest<{
            headers: Record<string, string | undefined>;
            user: AuthenticatedUser;
          }>();
          if (httpRequest.headers.authorization !== 'Bearer access-token') {
            throw new UnauthorizedException();
          }
          httpRequest.user = {
            id: profileResponse.userId,
            sessionId: 'session-id',
            email: profileResponse.email,
            role: currentRole,
            status: UserStatus.ACTIVE,
          };
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
  });

  beforeEach(() => {
    currentRole = UserRole.STUDENT;
    jest.clearAllMocks();
  });

  it('gets and patches the authenticated Student profile without a client user id', async () => {
    const getResponse = await request(app.getHttpServer())
      .get('/api/v1/profile/me')
      .set('Authorization', 'Bearer access-token')
      .expect(200);
    const responseBody = getResponse.body as typeof profileResponse;
    expect(responseBody.profile.avatarUrl).toBe(profileResponse.profile.avatarUrl);
    expect(profileService.getMyProfile).toHaveBeenCalledWith(profileResponse.userId);

    await request(app.getHttpServer())
      .patch('/api/v1/profile/me')
      .set('Authorization', 'Bearer access-token')
      .send({ bio: ' TOEIC 850 ', birthday: '2003-08-15', gender: Gender.MALE })
      .expect(200);
    expect(profileService.updateMyProfile).toHaveBeenCalledWith(profileResponse.userId, {
      bio: 'TOEIC 850',
      birthday: '2003-08-15',
      gender: Gender.MALE,
    });
  });

  it('allows Teachers and forbids Admins', async () => {
    currentRole = UserRole.TEACHER;
    await request(app.getHttpServer())
      .patch('/api/v1/profile/me')
      .set('Authorization', 'Bearer access-token')
      .send({ fullName: 'Teacher' })
      .expect(200);

    currentRole = UserRole.ADMIN;
    await request(app.getHttpServer())
      .get('/api/v1/profile/me')
      .set('Authorization', 'Bearer access-token')
      .expect(403);
  });

  it('rejects absent and invalid access tokens', async () => {
    await request(app.getHttpServer()).get('/api/v1/profile/me').expect(401);
    await request(app.getHttpServer())
      .get('/api/v1/profile/me')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);
  });

  it.each([
    [{ role: UserRole.ADMIN }, 400],
    [{ fullName: null }, 400],
    [{ avatarUrl: 'https://evil.example/avatar.png' }, 400],
    [{ birthday: '2999-01-01' }, 400],
    [{ gender: 'invalid' }, 400],
    [{ bio: 'x'.repeat(501) }, 400],
  ])('rejects invalid patch input %#', async (body, status) => {
    await request(app.getHttpServer())
      .patch('/api/v1/profile/me')
      .set('Authorization', 'Bearer access-token')
      .send(body)
      .expect(status);
  });

  it('rejects an empty patch', async () => {
    profileService.updateMyProfile.mockRejectedValueOnce(
      new BadRequestException('At least one profile field is required'),
    );
    await request(app.getHttpServer())
      .patch('/api/v1/profile/me')
      .set('Authorization', 'Bearer access-token')
      .send({})
      .expect(400);
  });

  afterAll(async () => {
    await app.close();
  });
});
