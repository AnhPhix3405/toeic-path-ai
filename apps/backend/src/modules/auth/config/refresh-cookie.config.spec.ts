import type { ConfigService } from '@nestjs/config';
import { validateEnvironment } from '../../../config/environment.validation';
import { getRefreshCookieClearOptions, getRefreshCookieOptions } from './refresh-cookie.config';

describe('refresh cookie configuration', () => {
  it('builds secure production cookie options and matching clear options', () => {
    const values: Record<string, unknown> = {
      'refreshCookie.secure': true,
      'refreshCookie.sameSite': 'none',
      'refreshCookie.path': '/api/v1/auth',
      'refreshCookie.maxAge': 604800000,
    };
    const configService = {
      getOrThrow: jest.fn((key: string) => values[key]),
    } as unknown as ConfigService;

    expect(getRefreshCookieOptions(configService)).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/api/v1/auth',
      maxAge: 604800000,
    });
    expect(getRefreshCookieClearOptions(configService)).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/api/v1/auth',
    });
  });

  it('rejects SameSite=None without Secure', () => {
    expect(() =>
      validateEnvironment({
        DB_HOST: 'localhost',
        DB_PORT: '5432',
        DB_USERNAME: 'user',
        DB_PASSWORD: 'password',
        DB_DATABASE: 'database',
        JWT_PRIVATE_KEY_PATH: './private.key',
        JWT_PUBLIC_KEY_PATH: './public.key',
        TERMS_VERSION: '2026-08-31',
        JWT_REFRESH_EXPIRES_IN: '7d',
        REFRESH_COOKIE_MAX_AGE_MS: '604800000',
        REFRESH_COOKIE_SECURE: 'false',
        REFRESH_COOKIE_SAME_SITE: 'none',
      }),
    ).toThrow('REFRESH_COOKIE_SECURE must be true when REFRESH_COOKIE_SAME_SITE is none');
  });
});
