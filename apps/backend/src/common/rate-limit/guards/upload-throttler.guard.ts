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
  UPLOAD_RATE_LIMIT_POLICY,
  AUTH_RATE_LIMIT_STORE,
  type UploadRateLimitPolicyName,
} from '../rate-limit.constants';
import type { AuthRateLimitStore, RateLimitResult } from '../interfaces/rate-limit-store.interface';
import { RateLimitKeyService } from '../services/rate-limit-key.service';
import { SecurityEventService } from '../../security-events/security-event.service';
import { SecurityEventType } from '../../security-events/enums/security-event.enum';
import type { SecurityRequest } from '../../security-events/request-context.middleware';

type UploadPolicy = {
  ttl: number;
  user?: number;
  ip: number;
};

interface AuthenticatedUploadRequest extends SecurityRequest {
  user?: {
    id: string;
    [key: string]: unknown;
  };
}

@Injectable()
export class UploadThrottlerGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
    private readonly keys: RateLimitKeyService,
    @Inject(AUTH_RATE_LIMIT_STORE) private readonly store: AuthRateLimitStore,
    @Optional() private readonly securityEvents?: SecurityEventService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const name = this.reflector.get<UploadRateLimitPolicyName>(
      UPLOAD_RATE_LIMIT_POLICY,
      context.getHandler(),
    );
    if (!name || !this.config.get<boolean>('rateLimit.enabled', true)) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedUploadRequest>();
    const response = context.switchToHttp().getResponse<Response>();
    const policy = this.config.getOrThrow<UploadPolicy>(`rateLimit.${name}`);
    const endpoint = this.endpoint(name);

    // Dimension 1: IP-level rate limiting
    await this.consume(
      this.keys.uploadIp(request, endpoint),
      policy.ip,
      policy.ttl,
      response,
      endpoint,
      request,
    );

    // Dimension 2: User-level rate limiting (when user is authenticated)
    const userId = request.user?.id;
    if (userId && policy.user) {
      await this.consume(
        this.keys.user(userId, endpoint),
        policy.user,
        policy.ttl,
        response,
        endpoint,
        request,
      );
    }

    return true;
  }

  private async consume(
    key: string,
    limit: number,
    ttl: number,
    response: Response,
    endpoint: string,
    request: AuthenticatedUploadRequest,
  ): Promise<void> {
    const result = await this.store.consume(key, limit, ttl);
    this.setHeaders(response, result);
    if (!result.allowed) {
      this.reject(result.retryAfterSeconds, response, endpoint, request);
    }
  }

  private reject(
    seconds: number,
    response: Response,
    endpoint: string,
    request: AuthenticatedUploadRequest,
  ): never {
    response.setHeader('Retry-After', seconds);
    this.securityEvents?.warn({
      event: SecurityEventType.UPLOAD_RATE_LIMIT_EXCEEDED,
      result: 'blocked',
      module: 'security',
      traceId: request.traceId,
      ipAddress: request.ip,
      userAgent: request.get('user-agent'),
      reasonCode: 'RATE_LIMIT_EXCEEDED',
      metadata: { endpoint, policyName: endpoint, retryAfterSeconds: seconds, userId: request.user?.id },
    });
    throw new HttpException(
      {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many upload requests. Please try again later.',
        details: null,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  private setHeaders(response: Response, result: RateLimitResult): void {
    response.setHeader('RateLimit-Limit', result.limit);
    response.setHeader('RateLimit-Remaining', result.remaining);
    response.setHeader('RateLimit-Reset', result.retryAfterSeconds);
  }

  private endpoint(name: UploadRateLimitPolicyName): string {
    return name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
  }
}
