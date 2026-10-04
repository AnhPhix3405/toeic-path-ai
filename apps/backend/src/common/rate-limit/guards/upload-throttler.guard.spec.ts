import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { UploadThrottlerGuard } from './upload-throttler.guard';
import { RateLimitKeyService } from '../services/rate-limit-key.service';
import { AuthRateLimitStore } from '../interfaces/rate-limit-store.interface';
import { SecurityEventService } from '../../security-events/security-event.service';
import { SecurityEventType } from '../../security-events/enums/security-event.enum';

describe('UploadThrottlerGuard', () => {
  let guard: UploadThrottlerGuard;
  let reflector: jest.Mocked<Reflector>;
  let config: jest.Mocked<ConfigService>;
  let keys: jest.Mocked<RateLimitKeyService>;
  let store: jest.Mocked<AuthRateLimitStore>;
  let securityEvents: jest.Mocked<SecurityEventService>;

  const createMockContext = (options: {
    user?: { id: string };
    ip?: string;
    traceId?: string;
  } = {}): ExecutionContext => {
    const headers: Record<string, string | number> = {};
    const req = {
      user: options.user,
      ip: options.ip ?? '127.0.0.1',
      traceId: options.traceId ?? 'test-trace-id',
      get: jest.fn().mockReturnValue('test-user-agent'),
    };
    const res = {
      setHeader: jest.fn((name: string, value: string | number) => {
        headers[name] = value;
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
    reflector = { get: jest.fn() } as unknown as jest.Mocked<Reflector>;
    config = { get: jest.fn(), getOrThrow: jest.fn() } as unknown as jest.Mocked<ConfigService>;
    keys = {
      uploadIp: jest.fn(),
      user: jest.fn(),
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

    guard = new UploadThrottlerGuard(reflector, config, keys, store, securityEvents);
  });

  it('should pass through if no upload policy metadata is set', async () => {
    reflector.get.mockReturnValue(undefined);
    const context = createMockContext();
    expect(await guard.canActivate(context)).toBe(true);
    expect(store.consume).not.toHaveBeenCalled();
  });

  it('should pass through if rate limiting is disabled in config', async () => {
    reflector.get.mockReturnValue('uploadAvatar');
    config.get.mockReturnValue(false); // rateLimit.enabled = false
    const context = createMockContext();
    expect(await guard.canActivate(context)).toBe(true);
    expect(store.consume).not.toHaveBeenCalled();
  });

  it('should consume both user and ip limits and allow request within quota', async () => {
    reflector.get.mockReturnValue('uploadAvatar');
    config.get.mockReturnValue(true);
    config.getOrThrow.mockReturnValue({ ttl: 60, user: 5, ip: 10 });
    keys.uploadIp.mockReturnValue('test:upload:avatar:ip:127.0.0.1');
    keys.user.mockReturnValue('test:upload:avatar:user:user-1');
    store.consume
      .mockResolvedValueOnce({ allowed: true, limit: 10, remaining: 9, retryAfterSeconds: 60 }) // IP
      .mockResolvedValueOnce({ allowed: true, limit: 5, remaining: 4, retryAfterSeconds: 60 }); // User

    const context = createMockContext({ user: { id: 'user-1' }, ip: '127.0.0.1' });
    expect(await guard.canActivate(context)).toBe(true);
    expect(store.consume).toHaveBeenCalledTimes(2);
  });

  it('should fallback gracefully to IP protection if request.user is missing', async () => {
    reflector.get.mockReturnValue('uploadAvatar');
    config.get.mockReturnValue(true);
    config.getOrThrow.mockReturnValue({ ttl: 60, user: 5, ip: 10 });
    keys.uploadIp.mockReturnValue('test:upload:avatar:ip:127.0.0.1');
    store.consume.mockResolvedValueOnce({ allowed: true, limit: 10, remaining: 9, retryAfterSeconds: 60 });

    const context = createMockContext({ ip: '127.0.0.1' }); // No user
    expect(await guard.canActivate(context)).toBe(true);
    expect(store.consume).toHaveBeenCalledTimes(1);
    expect(keys.user).not.toHaveBeenCalled();
  });

  it('should throw 429 and emit security event when user limit is exceeded', async () => {
    reflector.get.mockReturnValue('uploadAvatar');
    config.get.mockReturnValue(true);
    config.getOrThrow.mockReturnValue({ ttl: 60, user: 5, ip: 10 });
    keys.uploadIp.mockReturnValue('test:upload:avatar:ip:127.0.0.1');
    keys.user.mockReturnValue('test:upload:avatar:user:user-1');
    store.consume
      .mockResolvedValueOnce({ allowed: true, limit: 10, remaining: 9, retryAfterSeconds: 60 }) // IP passes
      .mockResolvedValueOnce({ allowed: false, limit: 5, remaining: 0, retryAfterSeconds: 45 }); // User blocked

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
      message: 'Too many upload requests. Please try again later.',
      details: null,
    });

    expect(securityEvents.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        event: SecurityEventType.UPLOAD_RATE_LIMIT_EXCEEDED,
        reasonCode: 'RATE_LIMIT_EXCEEDED',
      }),
    );
  });


  it('should throw 429 and emit security event when IP limit is exceeded', async () => {
    reflector.get.mockReturnValue('uploadAvatar');
    config.get.mockReturnValue(true);
    config.getOrThrow.mockReturnValue({ ttl: 60, user: 5, ip: 10 });
    keys.uploadIp.mockReturnValue('test:upload:avatar:ip:127.0.0.1');
    keys.user.mockReturnValue('test:upload:avatar:user:user-1');
    store.consume.mockResolvedValueOnce({ allowed: false, limit: 10, remaining: 0, retryAfterSeconds: 50 }); // IP blocked

    const context = createMockContext({ user: { id: 'user-1' }, ip: '127.0.0.1' });
    await expect(guard.canActivate(context)).rejects.toThrow(HttpException);
    expect(securityEvents.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        event: SecurityEventType.UPLOAD_RATE_LIMIT_EXCEEDED,
        reasonCode: 'RATE_LIMIT_EXCEEDED',
      }),
    );
  });
});
