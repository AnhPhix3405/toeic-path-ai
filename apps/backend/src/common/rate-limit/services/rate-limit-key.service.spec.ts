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
});
