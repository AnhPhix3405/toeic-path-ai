import { Controller, Get, UseGuards } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { AuthThrottlerGuard } from './guards/auth-throttler.guard';
import { UploadThrottlerGuard } from './guards/upload-throttler.guard';
import { RateLimitModule } from './rate-limit.module';

@Controller('rate-limit-di-test')
class RateLimitDiTestController {
  @Get('auth')
  @UseGuards(AuthThrottlerGuard)
  getAuth(): void {}

  @Get('upload')
  @UseGuards(UploadThrottlerGuard)
  getUpload(): void {}
}

describe('RateLimitModule', () => {
  it('provides guard dependencies to an importing module', async () => {
    const module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot(), RateLimitModule],
      controllers: [RateLimitDiTestController],
    }).compile();

    expect(module.get(AuthThrottlerGuard)).toBeInstanceOf(AuthThrottlerGuard);
    expect(module.get(UploadThrottlerGuard)).toBeInstanceOf(UploadThrottlerGuard);
    await module.close();
  });
});

