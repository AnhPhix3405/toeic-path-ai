import { SetMetadata } from '@nestjs/common';
import { AUTH_RATE_LIMIT_POLICY, type AuthRateLimitPolicyName } from '../rate-limit.constants';

export const AuthRateLimit = (policy: AuthRateLimitPolicyName): MethodDecorator =>
  SetMetadata(AUTH_RATE_LIMIT_POLICY, policy);
