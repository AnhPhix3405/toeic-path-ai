import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { UserRole } from '../../common/enums/user-role.enum';
import { UserStatus } from '../../common/enums/user-status.enum';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { AuthController } from './auth.controller';
import type { AuthService, TokenResponse } from './auth.service';

describe('AuthController refresh cookie transport', () => {
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
  const cookieOptions = {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    path: '/api/v1/auth',
    maxAge: 604800000,
  } as const;
  let authService: jest.Mocked<Pick<AuthService, 'login' | 'refresh' | 'revoke'>>;
  let response: jest.Mocked<Pick<Response, 'cookie' | 'clearCookie'>>;
  let controller: AuthController;

  beforeEach(() => {
    authService = {
      login: jest.fn().mockResolvedValue(tokenResponse),
      refresh: jest.fn().mockResolvedValue(tokenResponse),
      revoke: jest.fn().mockResolvedValue(undefined),
    };
    response = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    };
    const values: Record<string, unknown> = {
      'refreshCookie.name': 'toeic_refresh_token',
      'refreshCookie.secure': cookieOptions.secure,
      'refreshCookie.sameSite': cookieOptions.sameSite,
      'refreshCookie.path': cookieOptions.path,
      'refreshCookie.maxAge': cookieOptions.maxAge,
    };
    const configService = {
      getOrThrow: jest.fn((key: string) => values[key]),
    } as unknown as ConfigService;
    controller = new AuthController(authService as unknown as AuthService, configService);
  });

  it('sets an HTTP-only refresh cookie and omits the token from login JSON', async () => {
    const body = await controller.login(
      { email: 'student@example.com', password: 'StrongPassword123!' },
      createRequest(),
      response as unknown as Response,
    );

    expect(response.cookie).toHaveBeenCalledWith(
      'toeic_refresh_token',
      'refresh-token',
      cookieOptions,
    );
    expect(body).toEqual({
      user: tokenResponse.user,
      accessToken: 'access-token',
      accessTokenExpiresIn: 900,
    });
    expect('refreshToken' in body).toBe(false);
  });

  it('reads refresh token from cookie, rotates it, and omits it from JSON', async () => {
    const body = await controller.refresh(
      createRequest({ toeic_refresh_token: 'old-refresh-token' }),
      response as unknown as Response,
    );

    expect(authService.refresh).toHaveBeenCalledWith('old-refresh-token', {
      userAgent: 'jest',
      ipAddress: '127.0.0.1',
    });
    expect(response.cookie).toHaveBeenCalledWith(
      'toeic_refresh_token',
      'refresh-token',
      cookieOptions,
    );
    expect(body).toEqual({
      accessToken: 'access-token',
      accessTokenExpiresIn: 900,
    });
  });

  it('clears the cookie and returns 401 when refresh cookie is missing', async () => {
    await expect(
      controller.refresh(createRequest(), response as unknown as Response),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(response.clearCookie).toHaveBeenCalledWith('toeic_refresh_token', {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/api/v1/auth',
    });
    expect(authService.refresh).not.toHaveBeenCalled();
  });

  it('revokes the session and clears the cookie on logout', async () => {
    const user: AuthenticatedUser = {
      id: 'user-id',
      sessionId: 'session-id',
      email: 'student@example.com',
      role: UserRole.STUDENT,
    };
    await controller.logout(
      { ...createRequest(), user } as Request & { user: AuthenticatedUser },
      response as unknown as Response,
    );

    expect(authService.revoke).toHaveBeenCalledWith(user);
    expect(response.clearCookie).toHaveBeenCalledTimes(1);
  });

  function createRequest(cookies: Record<string, string> = {}): Request {
    return {
      cookies,
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('jest'),
    } as unknown as Request;
  }
});
