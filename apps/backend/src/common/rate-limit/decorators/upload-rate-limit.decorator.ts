import { SetMetadata } from '@nestjs/common';
import {
  UPLOAD_RATE_LIMIT_POLICY,
  type UploadRateLimitPolicyName,
} from '../rate-limit.constants';

export const UploadRateLimit = (policy: UploadRateLimitPolicyName): MethodDecorator =>
  SetMetadata(UPLOAD_RATE_LIMIT_POLICY, policy);
