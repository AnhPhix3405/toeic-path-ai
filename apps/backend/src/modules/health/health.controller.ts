import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '../../common/rate-limit/decorators/skip-throttle.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiHealthCheckDoc, ApiHealthProtectedDoc } from './docs/health.doc';

@ApiTags('Health Check')
@SkipThrottle()
@Controller('health')
export class HealthController {
  @Get()
  @ApiHealthCheckDoc()
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('protected')
  @UseGuards(JwtAuthGuard)
  @ApiHealthProtectedDoc()
  protectedRoute() {
    return { message: 'Authenticated!' };
  }
}
