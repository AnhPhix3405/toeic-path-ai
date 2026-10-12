import { applyDecorators, HttpStatus } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import {
  ImportAsyncAcceptedDto,
  ImportJobDetailDto,
  ImportSyncResponseDto,
} from '../dto/response/import-job-response.dto';
import { PaginatedImportJobsResponseDto } from '../dto/response/paginated-import-jobs-response.dto';
import { SubmitForReviewResponseDto } from '../dto/response/submit-for-review-response.dto';
import { SubmitForReviewDto } from '../dto/request/submit-for-review.dto';
import { QuestionStatus } from '../enums/question-status.enum';

export function ApiQuestionsImportControllerDoc() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiResponse({
      status: HttpStatus.UNAUTHORIZED,
      description: 'Chưa đăng nhập hoặc token không hợp lệ.',
    }),
    ApiResponse({
      status: HttpStatus.FORBIDDEN,
      description: 'Không có quyền truy cập (yêu cầu vai trò TEACHER hoặc ADMIN).',
    }),
  );
}

export function ApiDownloadQuestionsTemplateDoc() {
  return applyDecorators(
    ApiOperation({
      summary: 'Tải về tệp Excel mẫu để import câu hỏi TOEIC',
      description:
        'Tải về file Excel mẫu 15 cột chuẩn kèm validation dropdown và sheet hướng dẫn chi tiết.',
    }),
    ApiProduces('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'File Excel mẫu (.xlsx).',
    }),
  );
}

export function ApiImportQuestionsDoc() {
  return applyDecorators(
    ApiOperation({
      summary: 'Import câu hỏi hàng loạt từ file Excel (.xlsx) hoặc gói ZIP (.zip)',
      description:
        'Hỗ trợ tệp < 100 dòng xử lý đồng bộ (201 Created), tệp >= 100 dòng xử lý bất đồng bộ qua BullMQ (202 Accepted). Giới hạn 5 lượt/15 phút.',
    }),
    ApiConsumes('multipart/form-data'),
    ApiQuery({
      name: 'targetStatus',
      required: false,
      enum: QuestionStatus,
      description: 'Trạng thái đích cho câu hỏi import (draft hoặc pending_review)',
    }),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          file: {
            type: 'string',
            format: 'binary',
            description: 'Tệp Excel (.xlsx tối đa 10MB) hoặc gói ZIP (.zip tối đa 50MB)',
          },
        },
        required: ['file'],
      },
    }),
    ApiResponse({
      status: HttpStatus.CREATED,
      description: 'Xử lý đồng bộ thành công (< 100 dòng).',
      type: ImportSyncResponseDto,
    }),
    ApiResponse({
      status: HttpStatus.ACCEPTED,
      description: 'Đã đưa vào hàng đợi xử lý bất đồng bộ (>= 100 dòng).',
      type: ImportAsyncAcceptedDto,
    }),
    ApiResponse({
      status: HttpStatus.BAD_REQUEST,
      description: 'Tệp tin không hợp lệ, Zip Slip hoặc dữ liệu sai định dạng.',
    }),
    ApiResponse({
      status: HttpStatus.TOO_MANY_REQUESTS,
      description: 'Vượt quá giới hạn gọi API (Rate limit policy questionsImport).',
    }),
  );
}

export function ApiGetImportJobDoc() {
  return applyDecorators(
    ApiOperation({
      summary: 'Lấy thông tin chi tiết và tiến độ của Import Job',
      description: 'Phục vụ polling kiểm tra trạng thái job import bất đồng bộ.',
    }),
    ApiParam({ name: 'id', description: 'ID của Import Job (UUID)' }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Thông tin chi tiết Import Job.',
      type: ImportJobDetailDto,
    }),
    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'Không tìm thấy Import Job.',
    }),
  );
}

export function ApiGetImportJobsDoc() {
  return applyDecorators(
    ApiOperation({
      summary: 'Lấy danh sách lịch sử các lượt import job phân trang',
      description: 'Giáo viên xem các job của mình; Quản trị viên xem tất cả.',
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Danh sách import job phân trang.',
      type: PaginatedImportJobsResponseDto,
    }),
  );
}

export function ApiSubmitForReviewDoc() {
  return applyDecorators(
    ApiOperation({
      summary: 'Gửi duyệt hàng loạt câu hỏi với cơ chế Group Atomicity',
      description:
        'Gửi duyệt danh sách câu hỏi. Đối với câu hỏi thuộc nhóm, tự động gom trọn bộ các câu con trong nhóm để đảm bảo tính toàn vẹn (tất cả hợp lệ mới được chuyển sang pending_review).',
    }),
    ApiBody({ type: SubmitForReviewDto }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Kết quả gửi duyệt câu hỏi.',
      type: SubmitForReviewResponseDto,
    }),
  );
}
