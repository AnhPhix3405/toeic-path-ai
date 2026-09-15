import { ConfigService } from '@nestjs/config';
import { SecurityEventType } from './enums/security-event.enum';
import type { SecurityEventWriter } from './interfaces/security-event-writer.interface';
import { SecurityEventService } from './security-event.service';

describe('SecurityEventService', () => {
  const values: Record<string, unknown> = {
    'securityEvents.enabled': true,
    'securityEvents.level': 'info',
    'securityEvents.hmacKey': 'a-secure-test-key-that-is-long-enough',
    'securityEvents.userAgentMaxLength': 5,
    'securityEvents.includeIp': true,
  };

  it('writes valid JSON, sanitizes fields, allowlists metadata, and redacts secrets', () => {
    const log = jest.fn<void, [string]>();
    const writer: SecurityEventWriter = { log, warn: jest.fn(), error: jest.fn() };
    const config = { get: jest.fn((key: string, fallback: unknown) => values[key] ?? fallback) };
    const service = new SecurityEventService(config as unknown as ConfigService, writer);

    service.info({
      event: SecurityEventType.AUTH_LOGIN_SUCCEEDED,
      result: 'success',
      module: 'auth',
      traceId: 'trace-1',
      userAgent: 'ab\ncd123',
      metadata: { endpoint: 'login', unknown: 'discard', password: 'secret' },
    });

    const serialized = log.mock.calls.at(0)?.at(0);
    expect(typeof serialized).toBe('string');
    const output = JSON.parse(serialized as string) as Record<string, unknown>;
    expect(output).toMatchObject({
      event: 'AUTH_LOGIN_SUCCEEDED',
      traceId: 'trace-1',
      userAgent: 'abcd1',
    });
    expect(output.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(output.metadata).toEqual({ endpoint: 'login', password: '[REDACTED]' });
    expect(JSON.stringify(output)).not.toContain('secret');
  });

  it('isolates writer failures from business code', () => {
    const writer: SecurityEventWriter = {
      log: () => {
        throw new Error('down');
      },
      warn: jest.fn(),
      error: jest.fn(),
    };
    const config = { get: jest.fn((key: string, fallback: unknown) => values[key] ?? fallback) };
    const service = new SecurityEventService(config as unknown as ConfigService, writer);
    expect(() =>
      service.info({
        event: SecurityEventType.AUTH_LOGIN_SUCCEEDED,
        result: 'success',
        module: 'auth',
      }),
    ).not.toThrow();
  });

  it('creates a deterministic HMAC fingerprint without exposing the email', () => {
    const writer = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
    const config = { get: jest.fn((key: string, fallback: unknown) => values[key] ?? fallback) };
    const service = new SecurityEventService(config as unknown as ConfigService, writer);
    expect(service.fingerprintEmail(' User@Example.com ')).toBe(
      service.fingerprintEmail('user@example.com'),
    );
    expect(service.fingerprintEmail('user@example.com')).not.toContain('user@example.com');
  });

  it('honors the configured minimum level and IP inclusion setting', () => {
    const log = jest.fn<void, [string]>();
    const warn = jest.fn<void, [string]>();
    const error = jest.fn<void, [string]>();
    const writer: SecurityEventWriter = { log, warn, error };
    const config = {
      get: jest.fn((key: string, fallback: unknown) =>
        key === 'securityEvents.level'
          ? 'error'
          : key === 'securityEvents.includeIp'
            ? false
            : (values[key] ?? fallback),
      ),
    };
    const service = new SecurityEventService(config as unknown as ConfigService, writer);
    service.warn({ event: SecurityEventType.AUTH_LOGIN_FAILED, result: 'failure', module: 'auth' });
    service.error({
      event: SecurityEventType.AUTH_LOGIN_FAILED,
      result: 'failure',
      module: 'auth',
      ipAddress: '127.0.0.1',
    });
    expect(warn).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledTimes(1);
    expect(error).not.toHaveBeenCalledWith(expect.stringContaining('127.0.0.1'));
  });
});
