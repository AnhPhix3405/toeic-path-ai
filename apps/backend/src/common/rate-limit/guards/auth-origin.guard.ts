import {
  ForbiddenException,
  Injectable,
  Optional,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SecurityEventService } from '../../security-events/security-event.service';
import { SecurityEventType } from '../../security-events/enums/security-event.enum';
import type { SecurityRequest } from '../../security-events/request-context.middleware';

@Injectable()
export class AuthOriginGuard implements CanActivate {
  constructor(
    private readonly config: ConfigService,
    @Optional() private readonly securityEvents?: SecurityEventService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<SecurityRequest>();
    const origin = request.get('origin');
    if (!origin) return true;
    const allowed = this.config.get<string[]>('app.authAllowedOrigins', []);
    if (allowed.includes(origin)) return true;
    this.securityEvents?.warn({
      event: SecurityEventType.AUTH_ORIGIN_REJECTED,
      result: 'blocked',
      module: 'security',
      traceId: request.traceId,
      ipAddress: request.ip,
      userAgent: request.get('user-agent'),
      reasonCode: 'ORIGIN_NOT_ALLOWED',
    });
    throw new ForbiddenException('Request origin is not allowed');
  }
}
