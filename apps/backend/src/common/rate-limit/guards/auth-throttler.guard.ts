import {
  Inject,
  Injectable,
  HttpException,
  HttpStatus,
  Logger,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import {
  AUTH_RATE_LIMIT_POLICY,
  AUTH_RATE_LIMIT_STORE,
  type AuthRateLimitPolicyName,
} from '../rate-limit.constants';
import type { AuthRateLimitStore, RateLimitResult } from '../interfaces/rate-limit-store.interface';
import { RateLimitKeyService } from '../services/rate-limit-key.service';

type Policy = {
  ttl: number;
  ip?: number;
  email?: number;
  emailFailure?: number;
  token?: number;
  session?: number;
  max?: number;
};

@Injectable()
export class AuthThrottlerGuard implements CanActivate {
  private readonly logger = new Logger(AuthThrottlerGuard.name);
  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
    private readonly keys: RateLimitKeyService,
    @Inject(AUTH_RATE_LIMIT_STORE) private readonly store: AuthRateLimitStore,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const name = this.reflector.get<AuthRateLimitPolicyName>(
      AUTH_RATE_LIMIT_POLICY,
      context.getHandler(),
    );
    if (!name || !this.config.get<boolean>('rateLimit.enabled', true)) return true;
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const policy = this.config.getOrThrow<Policy>(`rateLimit.${name}`);
    const endpoint = this.endpoint(name);

    await this.consume(
      this.keys.ip(request, endpoint),
      policy.ip ?? policy.max!,
      policy.ttl,
      response,
      endpoint,
    );
    const body = this.body(request);
    if (name === 'login') {
      const email = this.keys.normalizeEmail(body.email);
      if (email)
        await this.rejectIfBlocked(
          this.keys.sensitive(endpoint, 'email', email),
          policy.emailFailure!,
          policy.ttl,
          response,
          endpoint,
        );
    } else if (name === 'forgotPassword') {
      const email = this.keys.normalizeEmail(body.email);
      if (email)
        await this.consume(
          this.keys.sensitive(endpoint, 'email', email),
          policy.email!,
          policy.ttl,
          response,
          endpoint,
        );
    } else if (name === 'resetPassword' && typeof body.token === 'string') {
      await this.consume(
        this.keys.sensitive(endpoint, 'token', body.token),
        policy.token!,
        policy.ttl,
        response,
        endpoint,
      );
    } else if (name === 'refresh') {
      const token = this.cookie(request);
      if (token)
        await this.consume(
          this.keys.sensitive(endpoint, 'session', token),
          policy.session!,
          policy.ttl,
          response,
          endpoint,
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
  ): Promise<void> {
    const result = await this.store.consume(key, limit, ttl);
    this.setHeaders(response, result);
    if (!result.allowed) this.reject(result.retryAfterSeconds, response, endpoint);
  }

  private async rejectIfBlocked(
    key: string,
    limit: number,
    ttl: number,
    response: Response,
    endpoint: string,
  ): Promise<void> {
    if (await this.store.isBlocked(key, limit)) this.reject(ttl, response, endpoint);
  }

  private reject(seconds: number, response: Response, endpoint: string): never {
    response.setHeader('Retry-After', seconds);
    this.logger.warn({ event: 'AUTH_RATE_LIMIT_EXCEEDED', endpoint });
    throw new HttpException(
      {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
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

  private endpoint(name: AuthRateLimitPolicyName): string {
    return name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
  }

  private body(request: Request): Record<string, unknown> {
    return typeof request.body === 'object' && request.body !== null
      ? (request.body as Record<string, unknown>)
      : {};
  }

  private cookie(request: Request): string | undefined {
    const cookies: unknown = request.cookies;
    if (typeof cookies !== 'object' || cookies === null) return undefined;
    const name = this.config.getOrThrow<string>('refreshCookie.name');
    const value = (cookies as Record<string, unknown>)[name];
    return typeof value === 'string' ? value : undefined;
  }
}
