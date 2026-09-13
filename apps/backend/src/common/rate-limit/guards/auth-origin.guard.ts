import {
  ForbiddenException,
  Injectable,
  Logger,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

@Injectable()
export class AuthOriginGuard implements CanActivate {
  private readonly logger = new Logger(AuthOriginGuard.name);
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const origin = context.switchToHttp().getRequest<Request>().get('origin');
    if (!origin) return true;
    const allowed = this.config.get<string[]>('app.authAllowedOrigins', []);
    if (allowed.includes(origin)) return true;
    this.logger.warn({ event: 'AUTH_ORIGIN_REJECTED' });
    throw new ForbiddenException('Request origin is not allowed');
  }
}
