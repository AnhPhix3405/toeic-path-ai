import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { ApiAuthDoc } from '../../../common/decorators/swagger';
import { CreateExamDto } from '../dto/request/create-exam.dto';
import { UpdateExamDto } from '../dto/request/update-exam.dto';
import { ExamDetailResponseDto } from '../dto/response/exam-detail-response.dto';

export function ApiExamsControllerDoc() {
  return applyDecorators(
    ApiAuthDoc({
      unauthorizedDescription: 'Access token is invalid or absent',
      forbiddenDescription: 'Authenticated user has an unsupported role or does not own the exam',
    }),
    ApiTooManyRequestsResponse({ description: 'Rate limit exceeded' }),
  );
}

export function ApiCreateExamDoc() {
  return applyDecorators(
    ApiOperation({
      summary: 'Khởi tạo đề thi mới (Tự động seed 7 sections nếu full_test)',
      description:
        'Dành cho Teacher hoặc Admin. Nếu là full_test, tự động tạo 7 phần thi chuẩn TOEIC.',
    }),
    ApiBody({ type: CreateExamDto }),
    ApiCreatedResponse({ type: ExamDetailResponseDto }),
    ApiBadRequestResponse({
      description: 'Dữ liệu không hợp lệ hoặc thời điểm đóng thi trước mở thi',
    }),
  );
}

export function ApiGetExamManageDoc() {
  return applyDecorators(
    ApiOperation({
      summary: 'Lấy thông tin chi tiết đề thi phục vụ quản trị',
      description:
        'Dành cho Teacher (sở hữu đề) hoặc Admin. Trả về cấu hình đề thi cùng danh sách sections.',
    }),
    ApiParam({ name: 'id', format: 'uuid', description: 'UUID của đề thi' }),
    ApiOkResponse({ type: ExamDetailResponseDto }),
    ApiNotFoundResponse({ description: 'Không tìm thấy đề thi' }),
  );
}

export function ApiUpdateExamDoc() {
  return applyDecorators(
    ApiOperation({
      summary: 'Cập nhật cấu hình đề thi (Kiểm soát Optimistic Lock qua trường version)',
      description:
        'Bắt buộc gửi trường version. Khóa các trường kỹ thuật khi đề đã đóng hoặc đã có học viên tham gia.',
    }),
    ApiParam({ name: 'id', format: 'uuid', description: 'UUID của đề thi' }),
    ApiBody({ type: UpdateExamDto }),
    ApiOkResponse({ type: ExamDetailResponseDto }),
    ApiBadRequestResponse({
      description: 'Lỗi validate, lịch thi không hợp lệ, hoặc sửa trường bị khóa',
    }),
    ApiConflictResponse({ description: 'Xung đột phiên làm việc (ERR_CONCURRENCY_CONFLICT)' }),
    ApiNotFoundResponse({ description: 'Không tìm thấy đề thi' }),
  );
}

export function ApiDeleteExamDoc() {
  return applyDecorators(
    ApiOperation({
      summary: 'Xóa mềm đề thi (Chặn xóa nếu đã có học viên tham gia thi)',
      description: 'Chỉ cho phép xóa mềm khi chưa có lượt làm bài nào. Ngược lại ném 409 Conflict.',
    }),
    ApiParam({ name: 'id', format: 'uuid', description: 'UUID của đề thi' }),
    ApiOkResponse({
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Xóa đề thi thành công.' },
        },
      },
    }),
    ApiConflictResponse({
      description: 'Đề thi đã có học viên tham gia, không thể xóa (ERR_EXAM_HAS_ATTEMPTS)',
    }),
    ApiNotFoundResponse({ description: 'Không tìm thấy đề thi' }),
  );
}
