import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { GlobalThrottlerGuard } from './global-throttler.guard';
import { RateLimitKeyService } from '../services/rate-limit-key.service';
import { AuthRateLimitStore } from '../interfaces/rate-limit-store.interface';
import { SecurityEventService } from '../../security-events/security-event.service';
import { SecurityEventType } from '../../security-events/enums/security-event.enum';
import {
  SKIP_THROTTLE,
  THROTTLE_POLICY,
  UPLOAD_RATE_LIMIT_POLICY,
  AUTH_RATE_LIMIT_POLICY,
} from '../rate-limit.constants';

describe('GlobalThrottlerGuard', () => {
  let guard: GlobalThrottlerGuard;
  let reflector: jest.Mocked<Reflector>;
  let config: jest.Mocked<ConfigService>;
  let keys: jest.Mocked<RateLimitKeyService>;
  let store: jest.Mocked<AuthRateLimitStore>;
  let securityEvents: jest.Mocked<SecurityEventService>;
  let responseHeaders: Record<string, string | number>;

  const createMockContext = (
    options: {
      ip?: string;
      traceId?: string;
    } = {},
  ): ExecutionContext => {
    responseHeaders = {};
    const req = {
      ip: options.ip ?? '127.0.0.1',
      traceId: options.traceId ?? 'test-trace-id',
      get: jest.fn().mockReturnValue('test-user-agent'),
    };
    const res = {
      setHeader: jest.fn((name: string, value: string | number) => {
        responseHeaders[name] = value;
      }),
    };
    return {
      getType: () => 'http',
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => res,
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    reflector = {
      get: jest.fn(),
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;
    config = { get: jest.fn(), getOrThrow: jest.fn() } as unknown as jest.Mocked<ConfigService>;
    keys = {
      globalIp: jest.fn().mockReturnValue('test:global:ip:127.0.0.1'),
    } as unknown as jest.Mocked<RateLimitKeyService>;
    store = {
      consume: jest.fn(),
      isBlocked: jest.fn(),
      recordFailure: jest.fn(),
      clear: jest.fn(),
    };
    securityEvents = {
      warn: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<SecurityEventService>;

    guard = new GlobalThrottlerGuard(reflector, config, keys, store, securityEvents);
  });

  it('should pass through if @SkipThrottle() is set', async () => {
    reflector.getAllAndOverride.mockImplementation((key) => {
      if (key === SKIP_THROTTLE) return true;
      return undefined;
    });
    const context = createMockContext();
    expect(await guard.canActivate(context)).toBe(true);
    expect(store.consume).not.toHaveBeenCalled();
  });

  it('should bypass and prevent double throttling if THROTTLE_POLICY is set', async () => {
    reflector.getAllAndOverride.mockImplementation((key) => {
      if (key === THROTTLE_POLICY) return 'questionsSearch';
      return undefined;
    });
    const context = createMockContext();
    expect(await guard.canActivate(context)).toBe(true);
    expect(store.consume).not.toHaveBeenCalled();
  });

  it('should bypass and prevent double throttling if UPLOAD_RATE_LIMIT_POLICY is set', async () => {
    reflector.getAllAndOverride.mockImplementation((key) => {
      if (key === UPLOAD_RATE_LIMIT_POLICY) return 'uploadAvatar';
      return undefined;
    });
    const context = createMockContext();
    expect(await guard.canActivate(context)).toBe(true);
    expect(store.consume).not.toHaveBeenCalled();
  });

  it('should bypass and prevent double throttling if AUTH_RATE_LIMIT_POLICY is set', async () => {
    reflector.getAllAndOverride.mockImplementation((key) => {
      if (key === AUTH_RATE_LIMIT_POLICY) return 'login';
      return undefined;
    });
    const context = createMockContext();
    expect(await guard.canActivate(context)).toBe(true);
    expect(store.consume).not.toHaveBeenCalled();
  });

  it('should pass through if rate limiting is disabled in config', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    config.get.mockImplementation((key) => {
      if (key === 'rateLimit.enabled') return false;
      return undefined;
    });
    const context = createMockContext();
    expect(await guard.canActivate(context)).toBe(true);
    expect(store.consume).not.toHaveBeenCalled();
  });

  it('should consume global IP limit and set rate limit headers on allowed request', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    config.get.mockImplementation((key, defaultVal) => {
      if (key === 'rateLimit.enabled') return true;
      if (key === 'rateLimit.global') return { ttl: 60, ip: 120 };
      return defaultVal;
    });
    store.consume.mockResolvedValueOnce({
      allowed: true,
      limit: 120,
      remaining: 119,
      retryAfterSeconds: 60,
    });

    const context = createMockContext({ ip: '127.0.0.1' });
    expect(await guard.canActivate(context)).toBe(true);
    expect(store.consume).toHaveBeenCalledWith('test:global:ip:127.0.0.1', 120, 60);
    expect(responseHeaders['RateLimit-Limit']).toBe(120);
    expect(responseHeaders['RateLimit-Remaining']).toBe(119);
    expect(responseHeaders['RateLimit-Reset']).toBe(60);
    expect(responseHeaders['Retry-After']).toBeUndefined();
  });

  it('should throw 429, set Retry-After header, and emit security event when global IP limit is exceeded', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    config.get.mockImplementation((key, defaultVal) => {
      if (key === 'rateLimit.enabled') return true;
      if (key === 'rateLimit.global') return { ttl: 60, ip: 120 };
      return defaultVal;
    });
    store.consume.mockResolvedValueOnce({
      allowed: false,
      limit: 120,
      remaining: 0,
      retryAfterSeconds: 40,
    });

    const context = createMockContext({ ip: '127.0.0.1' });

    let caughtError: HttpException | undefined;
    try {
      await guard.canActivate(context);
    } catch (err: unknown) {
      caughtError = err as HttpException;
    }

    expect(caughtError).toBeInstanceOf(HttpException);
    expect(caughtError?.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    expect(caughtError?.getResponse()).toEqual({
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again later.',
      details: null,
    });
    expect(responseHeaders['Retry-After']).toBe(40);

    expect(securityEvents.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        event: SecurityEventType.RATE_LIMIT_EXCEEDED,
        reasonCode: 'GLOBAL_RATE_LIMIT_EXCEEDED',
      }),
    );
  });
});
