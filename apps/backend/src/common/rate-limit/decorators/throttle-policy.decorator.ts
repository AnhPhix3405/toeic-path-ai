import { SetMetadata, type CustomDecorator } from '@nestjs/common';
import { THROTTLE_POLICY, type ThrottlePolicyName } from '../rate-limit.constants';

export const ThrottlePolicy = (name: ThrottlePolicyName): CustomDecorator<symbol> =>
  SetMetadata(THROTTLE_POLICY, name);
