import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiHealthCheckDoc, ApiHealthProtectedDoc } from './docs/health.doc';

@ApiTags('Health Check')
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
