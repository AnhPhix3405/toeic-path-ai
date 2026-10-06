import {
  Inject,
  Injectable,
  HttpException,
  HttpStatus,
  Optional,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';
import {
  AUTH_RATE_LIMIT_STORE,
  AUTH_RATE_LIMIT_POLICY,
  UPLOAD_RATE_LIMIT_POLICY,
  THROTTLE_POLICY,
  SKIP_THROTTLE,
} from '../rate-limit.constants';
import type { AuthRateLimitStore, RateLimitResult } from '../interfaces/rate-limit-store.interface';
import { RateLimitKeyService } from '../services/rate-limit-key.service';
import { SecurityEventService } from '../../security-events/security-event.service';
import { SecurityEventType } from '../../security-events/enums/security-event.enum';
import type { SecurityRequest } from '../../security-events/request-context.middleware';

type GlobalPolicy = {
  ttl: number;
  ip: number;
};

@Injectable()
export class GlobalThrottlerGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
    private readonly keys: RateLimitKeyService,
    @Inject(AUTH_RATE_LIMIT_STORE) private readonly store: AuthRateLimitStore,
    @Optional() private readonly securityEvents?: SecurityEventService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') {
      return true;
    }

    const isSkipped = this.getMetadata<boolean>(SKIP_THROTTLE, context) === true;
    if (isSkipped) {
      return true;
    }

    // Anti Double-Throttling: Bypass global throttler if a specialized policy exists
    const hasCustomPolicy =
      Boolean(this.getMetadata(THROTTLE_POLICY, context)) ||
      Boolean(this.getMetadata(UPLOAD_RATE_LIMIT_POLICY, context)) ||
      Boolean(this.getMetadata(AUTH_RATE_LIMIT_POLICY, context));

    if (hasCustomPolicy) {
      return true;
    }

    if (!this.config.get<boolean>('rateLimit.enabled', true)) {
      return true;
    }

    const request = context.switchToHttp().getRequest<SecurityRequest>();
    const response = context.switchToHttp().getResponse<Response>();
    const policy = this.config.get<GlobalPolicy>('rateLimit.global', { ttl: 60, ip: 120 });
    const key = this.keys.globalIp(request);

    const result = await this.store.consume(key, policy.ip, policy.ttl);
    this.setHeaders(response, result);

    if (!result.allowed) {
      response.setHeader('Retry-After', result.retryAfterSeconds);
      this.securityEvents?.warn({
        event: SecurityEventType.RATE_LIMIT_EXCEEDED,
        result: 'blocked',
        module: 'security',
        traceId: request.traceId,
        ipAddress: request.ip,
        userAgent: request.get('user-agent'),
        reasonCode: 'GLOBAL_RATE_LIMIT_EXCEEDED',
        metadata: {
          policyName: 'global',
          retryAfterSeconds: result.retryAfterSeconds,
        },
      });

      throw new HttpException(
        {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.',
          details: null,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private setHeaders(response: Response, result: RateLimitResult): void {
    response.setHeader('RateLimit-Limit', result.limit);
    response.setHeader('RateLimit-Remaining', result.remaining);
    response.setHeader('RateLimit-Reset', result.retryAfterSeconds);
  }

  private getMetadata<T>(key: symbol, context: ExecutionContext): T | undefined {
    if (typeof this.reflector.getAllAndOverride === 'function') {
      return this.reflector.getAllAndOverride<T>(key, [
        context.getHandler(),
        context.getClass(),
      ]);
    }
    return this.reflector.get<T>(key, context.getHandler());
  }
}
