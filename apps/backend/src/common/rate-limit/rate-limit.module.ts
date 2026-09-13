import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AUTH_RATE_LIMIT_STORE } from './rate-limit.constants';
import { InMemoryAuthRateLimitStore } from './stores/in-memory-auth-rate-limit.store';
import { RateLimitKeyService } from './services/rate-limit-key.service';
import { AuthThrottlerGuard } from './guards/auth-throttler.guard';
import { LoginFailureInterceptor } from './interceptors/login-failure.interceptor';
import { AuthOriginGuard } from './guards/auth-origin.guard';

@Module({
  imports: [ConfigModule],
  providers: [
    InMemoryAuthRateLimitStore,
    { provide: AUTH_RATE_LIMIT_STORE, useExisting: InMemoryAuthRateLimitStore },
    RateLimitKeyService,
    AuthThrottlerGuard,
    LoginFailureInterceptor,
    AuthOriginGuard,
  ],
  exports: [
    AUTH_RATE_LIMIT_STORE,
    RateLimitKeyService,
    AuthThrottlerGuard,
    LoginFailureInterceptor,
    AuthOriginGuard,
  ],
})
export class RateLimitModule {}
