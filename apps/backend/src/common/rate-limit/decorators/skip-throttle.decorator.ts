import { SetMetadata, type CustomDecorator } from '@nestjs/common';
import { SKIP_THROTTLE } from '../rate-limit.constants';

export const SkipThrottle = (): CustomDecorator<symbol> => SetMetadata(SKIP_THROTTLE, true);
