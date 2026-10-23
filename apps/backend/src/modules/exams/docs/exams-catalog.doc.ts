import { applyDecorators, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PaginatedExamsCatalogResponseDto } from '../dto/response/paginated-exams-catalog-response.dto';
import { PaginatedManageExamsResponseDto } from '../dto/response/paginated-manage-exams-response.dto';
import { ExamOverviewResponseDto } from '../dto/response/exam-overview-response.dto';

export function ApiExamsCatalogTag() {
  return ApiTags('Exams Catalog');
}

export function ApiPublicCatalogDoc() {
  return applyDecorators(
    ApiOperation({
      summary: 'Tra cứu danh mục đề thi công khai (Public Catalog)',
      description:
        'Dành cho học viên và khách vãng lai. Chỉ trả về các đề thi đã xuất bản (status=published), chưa xóa và chưa hết hạn. Tự động tính cờ isScheduled.',
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Lấy danh sách đề thi công khai thành công',
      type: PaginatedExamsCatalogResponseDto,
    }),
  );
}

export function ApiManageCatalogDoc() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Tra cứu danh mục đề thi quản trị (Management Catalog)',
      description:
        'Dành cho Teacher và Admin. Teacher chỉ xem đề thi do mình tạo hoặc đề thi đã published. Admin xem toàn bộ đề thi trong hệ thống.',
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Lấy danh mục đề thi quản trị thành công',
      type: PaginatedManageExamsResponseDto,
    }),
    ApiResponse({
      status: HttpStatus.UNAUTHORIZED,
      description: 'Chưa đăng nhập hoặc token không hợp lệ',
    }),
    ApiResponse({
      status: HttpStatus.FORBIDDEN,
      description: 'Không có quyền truy cập (yêu cầu role TEACHER hoặc ADMIN)',
    }),
  );
}

export function ApiExamOverviewDoc() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Xem chi tiết tổng quan đề thi (Zero Answer Leakage)',
      description:
        'Xem cấu trúc phần thi, thời lượng, số câu hỏi của đề thi đã xuất bản. Đảm bảo tuyệt đối không rò rỉ câu hỏi, đáp án hay lời giải thích.',
    }),
    ApiParam({
      name: 'id',
      description: 'UUID của đề thi',
      example: 'a0a7b45f-14f7-4148-8eb1-14f717880000',
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Lấy thông tin tổng quan thành công',
      type: ExamOverviewResponseDto,
    }),
    ApiResponse({
      status: HttpStatus.BAD_REQUEST,
      description: 'Đề thi đã đóng (ERR_EXAM_CLOSED)',
    }),
    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'Không tìm thấy đề thi hoặc đề thi chưa được xuất bản (ERR_EXAM_NOT_FOUND)',
    }),
  );
}
