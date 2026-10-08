import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { PolicyThrottlerGuard } from './policy-throttler.guard';
import { RateLimitKeyService } from '../services/rate-limit-key.service';
import { AuthRateLimitStore } from '../interfaces/rate-limit-store.interface';
import { SecurityEventService } from '../../security-events/security-event.service';
import { SecurityEventType } from '../../security-events/enums/security-event.enum';

describe('PolicyThrottlerGuard', () => {
  let guard: PolicyThrottlerGuard;
  let reflector: jest.Mocked<Reflector>;
  let config: jest.Mocked<ConfigService>;
  let keys: jest.Mocked<RateLimitKeyService>;
  let store: jest.Mocked<AuthRateLimitStore>;
  let securityEvents: jest.Mocked<SecurityEventService>;
  let responseHeaders: Record<string, string | number>;

  const createMockContext = (
    options: {
      user?: { id: string };
      ip?: string;
      traceId?: string;
    } = {},
  ): ExecutionContext => {
    responseHeaders = {};
    const req = {
      user: options.user,
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
      policyIp: jest.fn(),
      policyUser: jest.fn(),
      user: jest.fn(),
      uploadIp: jest.fn(),
      globalIp: jest.fn(),
      ip: jest.fn(),
      sensitive: jest.fn(),
      normalizeEmail: jest.fn(),
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

    guard = new PolicyThrottlerGuard(reflector, config, keys, store, securityEvents);
  });

  it('should pass through if @SkipThrottle() is set', async () => {
    reflector.getAllAndOverride.mockImplementation((key) => {
      if (typeof key === 'symbol' && key.description === 'SKIP_THROTTLE') return true;
      return undefined;
    });
    const context = createMockContext();
    expect(await guard.canActivate(context)).toBe(true);
    expect(store.consume).not.toHaveBeenCalled();
  });

  it('should pass through if no policy metadata is set', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const context = createMockContext();
    expect(await guard.canActivate(context)).toBe(true);
    expect(store.consume).not.toHaveBeenCalled();
  });

  it('should pass through if rate limiting is disabled in config', async () => {
    reflector.getAllAndOverride.mockImplementation((key) => {
      if (typeof key === 'symbol' && key.description === 'THROTTLE_POLICY')
        return 'questionsSearch';
      return undefined;
    });
    config.get.mockReturnValue(false); // rateLimit.enabled = false
    const context = createMockContext();
    expect(await guard.canActivate(context)).toBe(true);
    expect(store.consume).not.toHaveBeenCalled();
  });

  it('should consume both user and ip limits and set standard rate limit headers on success', async () => {
    reflector.getAllAndOverride.mockImplementation((key) => {
      if (typeof key === 'symbol' && key.description === 'THROTTLE_POLICY')
        return 'questionsSearch';
      return undefined;
    });
    config.get.mockReturnValue(true);
    config.getOrThrow.mockReturnValue({ ttl: 60, user: 30, ip: 60 });
    keys.policyIp.mockReturnValue('test:policy:questionsSearch:ip:127.0.0.1');
    keys.policyUser.mockReturnValue('test:policy:questionsSearch:user:user-1');
    store.consume
      .mockResolvedValueOnce({ allowed: true, limit: 60, remaining: 59, retryAfterSeconds: 60 }) // IP
      .mockResolvedValueOnce({ allowed: true, limit: 30, remaining: 29, retryAfterSeconds: 60 }); // User

    const context = createMockContext({ user: { id: 'user-1' }, ip: '127.0.0.1' });
    expect(await guard.canActivate(context)).toBe(true);
    expect(store.consume).toHaveBeenCalledTimes(2);
    expect(responseHeaders['RateLimit-Limit']).toBe(30);
    expect(responseHeaders['RateLimit-Remaining']).toBe(29);
    expect(responseHeaders['RateLimit-Reset']).toBe(60);
    expect(responseHeaders['Retry-After']).toBeUndefined();
  });

  it('should fallback gracefully to IP protection if request.user is missing', async () => {
    reflector.getAllAndOverride.mockImplementation((key) => {
      if (typeof key === 'symbol' && key.description === 'THROTTLE_POLICY')
        return 'questionsSearch';
      return undefined;
    });
    config.get.mockReturnValue(true);
    config.getOrThrow.mockReturnValue({ ttl: 60, user: 30, ip: 60 });
    keys.policyIp.mockReturnValue('test:policy:questionsSearch:ip:127.0.0.1');
    store.consume.mockResolvedValueOnce({
      allowed: true,
      limit: 60,
      remaining: 59,
      retryAfterSeconds: 60,
    });

    const context = createMockContext({ ip: '127.0.0.1' });
    expect(await guard.canActivate(context)).toBe(true);
    expect(store.consume).toHaveBeenCalledTimes(1);
    expect(keys.policyUser).not.toHaveBeenCalled();
  });

  it('should throw 429, set Retry-After header, and emit RATE_LIMIT_EXCEEDED when user limit is exceeded for questions search', async () => {
    reflector.getAllAndOverride.mockImplementation((key) => {
      if (typeof key === 'symbol' && key.description === 'THROTTLE_POLICY')
        return 'questionsSearch';
      return undefined;
    });
    config.get.mockReturnValue(true);
    config.getOrThrow.mockReturnValue({ ttl: 60, user: 30, ip: 60 });
    keys.policyIp.mockReturnValue('test:policy:questionsSearch:ip:127.0.0.1');
    keys.policyUser.mockReturnValue('test:policy:questionsSearch:user:user-1');
    store.consume
      .mockResolvedValueOnce({ allowed: true, limit: 60, remaining: 59, retryAfterSeconds: 60 }) // IP passes
      .mockResolvedValueOnce({ allowed: false, limit: 30, remaining: 0, retryAfterSeconds: 45 }); // User blocked

    const context = createMockContext({ user: { id: 'user-1' }, ip: '127.0.0.1' });

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
    expect(responseHeaders['Retry-After']).toBe(45);

    expect(securityEvents.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        event: SecurityEventType.RATE_LIMIT_EXCEEDED,
        reasonCode: 'RATE_LIMIT_EXCEEDED',
      }),
    );
  });

  it('should throw 429 and emit UPLOAD_RATE_LIMIT_EXCEEDED for upload policy', async () => {
    reflector.getAllAndOverride.mockImplementation((key) => {
      if (typeof key === 'symbol' && key.description === 'THROTTLE_POLICY') return 'uploadAvatar';
      return undefined;
    });
    config.get.mockReturnValue(true);
    config.getOrThrow.mockReturnValue({ ttl: 60, user: 5, ip: 10 });
    keys.policyIp.mockReturnValue('test:policy:uploadAvatar:ip:127.0.0.1');
    keys.policyUser.mockReturnValue('test:policy:uploadAvatar:user:user-1');
    store.consume
      .mockResolvedValueOnce({ allowed: true, limit: 10, remaining: 9, retryAfterSeconds: 60 })
      .mockResolvedValueOnce({ allowed: false, limit: 5, remaining: 0, retryAfterSeconds: 30 });

    const context = createMockContext({ user: { id: 'user-1' }, ip: '127.0.0.1' });

    let caughtError: HttpException | undefined;
    try {
      await guard.canActivate(context);
    } catch (err: unknown) {
      caughtError = err as HttpException;
    }

    expect(caughtError?.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    expect(caughtError?.getResponse()).toEqual({
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many upload requests. Please try again later.',
      details: null,
    });
    expect(responseHeaders['Retry-After']).toBe(30);

    expect(securityEvents.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        event: SecurityEventType.UPLOAD_RATE_LIMIT_EXCEEDED,
        reasonCode: 'RATE_LIMIT_EXCEEDED',
      }),
    );
  });
});
