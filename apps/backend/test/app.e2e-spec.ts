import { INestApplication, type ExecutionContext } from '@nestjs/common';
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

describe('Auth refresh cookie (e2e)', () => {
  let app: INestApplication<App>;
  const authService = {
    login: jest.fn(),
    refresh: jest.fn(),
    revoke: jest.fn(),
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
    app.use(cookieParser());
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    authService.login.mockResolvedValue(tokenResponse);
    authService.refresh.mockResolvedValue({
      ...tokenResponse,
      accessToken: 'rotated-access-token',
      refreshToken: 'rotated-refresh-token',
    });
    authService.revoke.mockResolvedValue(undefined);
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
