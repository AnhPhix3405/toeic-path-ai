import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AUTH_RATE_LIMIT_STORE } from './rate-limit.constants';
import { InMemoryAuthRateLimitStore } from './stores/in-memory-auth-rate-limit.store';
import { RateLimitKeyService } from './services/rate-limit-key.service';
import { AuthThrottlerGuard } from './guards/auth-throttler.guard';
import { UploadThrottlerGuard } from './guards/upload-throttler.guard';
import { PolicyThrottlerGuard } from './guards/policy-throttler.guard';
import { GlobalThrottlerGuard } from './guards/global-throttler.guard';
import { LoginFailureInterceptor } from './interceptors/login-failure.interceptor';
import { AuthOriginGuard } from './guards/auth-origin.guard';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    InMemoryAuthRateLimitStore,
    { provide: AUTH_RATE_LIMIT_STORE, useExisting: InMemoryAuthRateLimitStore },
    RateLimitKeyService,
    AuthThrottlerGuard,
    UploadThrottlerGuard,
    PolicyThrottlerGuard,
    GlobalThrottlerGuard,
    {
      provide: APP_GUARD,
      useClass: GlobalThrottlerGuard,
    },
    LoginFailureInterceptor,
    AuthOriginGuard,
  ],
  exports: [
    AUTH_RATE_LIMIT_STORE,
    RateLimitKeyService,
    AuthThrottlerGuard,
    UploadThrottlerGuard,
    PolicyThrottlerGuard,
    GlobalThrottlerGuard,
    LoginFailureInterceptor,
    AuthOriginGuard,
  ],
})
export class RateLimitModule {}

