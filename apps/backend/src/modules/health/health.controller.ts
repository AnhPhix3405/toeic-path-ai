import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '../../common/rate-limit/decorators/skip-throttle.decorator';
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
  @ApiHealthProtectedDoc()
  protectedRoute() {
    return { message: 'Authenticated!' };
  }
}
