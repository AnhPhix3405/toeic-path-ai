import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Health Check') // Nhóm endpoint trong trang Swagger UI
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Kiểm tra trạng thái hoạt động của hệ thống' })
  @ApiResponse({ status: 200, description: 'Hệ thống đang hoạt động bình thường.' })
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('protected')
  @ApiBearerAuth('JWT-auth') // Yêu cầu JWT token trên Swagger
  @ApiOperation({ summary: 'Endpoint thử nghiệm có bảo mật' })
  protectedRoute() {
    return { message: 'Authenticated!' };
  }
}
