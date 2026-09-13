import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { catchError, from, mergeMap, of, type Observable, throwError } from 'rxjs';
import { AUTH_RATE_LIMIT_STORE } from '../rate-limit.constants';
import type { AuthRateLimitStore } from '../interfaces/rate-limit-store.interface';
import { RateLimitKeyService } from '../services/rate-limit-key.service';

@Injectable()
export class LoginFailureInterceptor implements NestInterceptor {
  constructor(
    private readonly config: ConfigService,
    private readonly keys: RateLimitKeyService,
    @Inject(AUTH_RATE_LIMIT_STORE) private readonly store: AuthRateLimitStore,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (!this.config.get<boolean>('rateLimit.enabled', true)) return next.handle();
    const request = context.switchToHttp().getRequest<Request>();
    const body = request.body as Record<string, unknown> | undefined;
    const email = this.keys.normalizeEmail(body?.email);
    if (!email) return next.handle();
    const key = this.keys.sensitive('login', 'email', email);
    const ttl = this.config.getOrThrow<number>('rateLimit.login.ttl');
    const limit = this.config.getOrThrow<number>('rateLimit.login.emailFailure');
    return next.handle().pipe(
      mergeMap((value) =>
        from(Promise.resolve(this.store.reset(key))).pipe(mergeMap(() => of(value))),
      ),
      catchError((error: unknown) => {
        if (!(error instanceof UnauthorizedException)) return throwError(() => error);
        return from(Promise.resolve(this.store.consume(key, limit, ttl))).pipe(
          mergeMap(() => throwError(() => error)),
        );
      }),
    );
  }
}
