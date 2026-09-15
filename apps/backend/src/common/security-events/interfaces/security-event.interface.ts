import type { SecurityEventType } from '../enums/security-event.enum';

export interface SecurityEvent {
  event: SecurityEventType;
  result: 'success' | 'failure' | 'blocked';
  module: 'auth' | 'admin' | 'security';
  traceId: string;
  userId?: string | null;
  actorUserId?: string;
  targetUserId?: string;
  sessionId?: string;
  role?: string;
  ipAddress?: string;
  userAgent?: string;
  reasonCode?: string;
  durationMs?: number;
  emailFingerprint?: string;
  metadata?: Record<string, unknown>;
}

export type SecurityEventLevel = 'info' | 'warn' | 'error';

export type SecurityEventInput = Omit<SecurityEvent, 'traceId'> & { traceId?: string };
