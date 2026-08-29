import { registerAs } from '@nestjs/config';
import type { ConfigService } from '@nestjs/config';
import type { CookieOptions } from 'express';

export type RefreshCookieSameSite = 'lax' | 'strict' | 'none';

export default registerAs('refreshCookie', () => ({
  name: process.env.REFRESH_COOKIE_NAME ?? 'toeic_refresh_token',
  path: process.env.REFRESH_COOKIE_PATH ?? '/api/v1/auth',
  maxAge: Number(process.env.REFRESH_COOKIE_MAX_AGE_MS ?? 604800000),
  secure: process.env.REFRESH_COOKIE_SECURE === 'true',
  sameSite: (process.env.REFRESH_COOKIE_SAME_SITE ?? 'lax') as RefreshCookieSameSite,
}));

export function getRefreshCookieOptions(configService: ConfigService): CookieOptions {
  return {
    httpOnly: true,
    secure: configService.getOrThrow<boolean>('refreshCookie.secure'),
    sameSite: configService.getOrThrow<RefreshCookieSameSite>('refreshCookie.sameSite'),
    path: configService.getOrThrow<string>('refreshCookie.path'),
    maxAge: configService.getOrThrow<number>('refreshCookie.maxAge'),
  };
}

export function getRefreshCookieClearOptions(configService: ConfigService): CookieOptions {
  const options = getRefreshCookieOptions(configService);
  return {
    httpOnly: options.httpOnly,
    secure: options.secure,
    sameSite: options.sameSite,
    path: options.path,
  };
}
