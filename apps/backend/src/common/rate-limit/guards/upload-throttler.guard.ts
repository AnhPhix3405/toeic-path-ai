import { Injectable } from '@nestjs/common';
import { PolicyThrottlerGuard } from './policy-throttler.guard';

@Injectable()
export class UploadThrottlerGuard extends PolicyThrottlerGuard {}
