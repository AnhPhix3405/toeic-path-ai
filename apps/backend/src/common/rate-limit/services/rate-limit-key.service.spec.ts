import { ConfigService } from '@nestjs/config';
import { RateLimitKeyService } from './rate-limit-key.service';

describe('RateLimitKeyService', () => {
  const service = new RateLimitKeyService(
    new ConfigService({ rateLimit: { environment: 'test' } }),
  );

  it('normalizes IPv4-mapped IPv6 addresses', () => {
    expect(service.ip({ ip: '::ffff:127.0.0.1' } as never, 'login')).toBe(
      'test:auth:login:ip:127.0.0.1',
    );
  });

  it('normalizes and hashes email identifiers', () => {
    const normalized = service.normalizeEmail(' Student@Example.COM ');
    const key = service.sensitive('login', 'email', normalized!);
    expect(key).toMatch(/^test:auth:login:email:[a-f0-9]{64}$/);
    expect(key).not.toContain('student@example.com');
  });

  it('generates namespaced rate limit key for user id in upload routes', () => {
    const key = service.user('user-uuid-1234', 'upload-avatar');
    expect(key).toBe('test:upload:upload-avatar:user:user-uuid-1234');
  });

  it('generates namespaced rate limit key for ip in upload routes', () => {
    const key = service.uploadIp({ ip: '::ffff:192.168.1.1' } as never, 'upload-avatar');
    expect(key).toBe('test:upload:upload-avatar:ip:192.168.1.1');
  });

  it('generates namespaced rate limit key for user id with generic policy', () => {
    const key = service.policyUser('questionsSearch', 'user-uuid-1234');
    expect(key).toBe('test:policy:questionsSearch:user:user-uuid-1234');
  });

  it('generates namespaced rate limit key for ip with generic policy', () => {
    const key = service.policyIp({ ip: '::ffff:192.168.1.1' } as never, 'questionsSearch');
    expect(key).toBe('test:policy:questionsSearch:ip:192.168.1.1');
  });

  it('generates namespaced rate limit key for global fallback ip', () => {
    const key = service.globalIp({ ip: '::ffff:192.168.1.1' } as never);
    expect(key).toBe('test:global:ip:192.168.1.1');
  });
});

