import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomUUID } from 'node:crypto';
import type { SecurityEventInput, SecurityEventLevel } from './interfaces/security-event.interface';
import type { SecurityEventWriter } from './interfaces/security-event-writer.interface';
import { SECURITY_EVENT_WRITER } from './security-event.constants';
import { sanitizeMetadata, sanitizeUserAgent } from './security-event.mapper';

@Injectable()
export class SecurityEventService {
  private readonly fallbackWriter = new Logger('SecurityEvent');

  constructor(
    private readonly config: ConfigService,
    @Optional() @Inject(SECURITY_EVENT_WRITER) private readonly writer?: SecurityEventWriter,
  ) {}

  info(event: SecurityEventInput): void {
    this.recordSafely('info', event);
  }
  warn(event: SecurityEventInput): void {
    this.recordSafely('warn', event);
  }
  error(event: SecurityEventInput): void {
    this.recordSafely('error', event);
  }

  fingerprintEmail(email: string): string | undefined {
    const key = this.config.get<string>('securityEvents.hmacKey');
    if (!key) return undefined;
    return createHmac('sha256', key).update(email.trim().toLowerCase()).digest('hex');
  }

  private recordSafely(level: SecurityEventLevel, event: SecurityEventInput): void {
    if (!this.config.get<boolean>('securityEvents.enabled', true)) return;
    const configuredLevel = this.config.get<SecurityEventLevel>('securityEvents.level', 'info');
    const priority: Record<SecurityEventLevel, number> = { info: 0, warn: 1, error: 2 };
    if (priority[level] < priority[configuredLevel]) return;
    try {
      const maxLength = this.config.get<number>('securityEvents.userAgentMaxLength', 500);
      const includeIp = this.config.get<boolean>('securityEvents.includeIp', true);
      const record = {
        timestamp: new Date().toISOString(),
        level,
        service: 'backend',
        ...event,
        ipAddress: includeIp ? event.ipAddress : undefined,
        traceId: event.traceId || randomUUID(),
        userAgent: sanitizeUserAgent(event.userAgent, maxLength),
        metadata: sanitizeMetadata(event.metadata),
      };
      const json = JSON.stringify(
        Object.fromEntries(Object.entries(record).filter(([, v]) => v !== undefined)),
      );
      (this.writer ?? this.fallbackWriter)[level === 'info' ? 'log' : level](json);
    } catch {
      // Security logging must never affect the primary business operation.
    }
  }
}
