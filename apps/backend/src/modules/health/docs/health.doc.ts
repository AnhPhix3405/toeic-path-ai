import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

export function ApiHealthCheckDoc(): MethodDecorator {
  return applyDecorators(
    ApiOperation({ summary: 'Kiểm tra trạng thái hoạt động của hệ thống' }),
    ApiResponse({ status: 200, description: 'Hệ thống đang hoạt động bình thường.' }),
  );
}

export function ApiHealthProtectedDoc(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({ summary: 'Endpoint thử nghiệm có bảo mật' }),
  );
}
