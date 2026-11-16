import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { QuestionReportDetailResponseDto } from '../dto/response/question-report-detail-response.dto';
import {
  MyQuestionReportItemDto,
  PaginatedAdminQuestionReportsResponseDto,
  PaginatedMyQuestionReportsResponseDto,
  ResolveQuestionReportResponseDto,
} from '../dto/response/question-report-item-response.dto';

export const ApiQuestionReportsControllerDoc = () => applyDecorators(ApiBearerAuth());

export const ApiCreateQuestionReportDoc = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Học viên gửi báo cáo lỗi câu hỏi (UC29)',
      description:
        'Báo cáo câu hỏi sai đáp án, lỗi chính tả, thiếu media hoặc giải thích chưa rõ ràng. Bắt buộc description (10–1000 ký tự) khi reason = other. Chống spam báo cáo trùng bằng Partial Unique Index (409 ERR_DUPLICATE_OPEN_REPORT).',
    }),
    ApiParam({
      name: 'questionId',
      format: 'uuid',
      description: 'ID câu hỏi bị báo cáo',
    }),
    ApiCreatedResponse({
      description: 'Tạo báo cáo câu hỏi thành công',
      type: MyQuestionReportItemDto,
    }),
    ApiBadRequestResponse({
      description:
        'Dữ liệu không hợp lệ, lượt thi chưa nộp (ERR_ATTEMPT_NOT_SUBMITTED) hoặc câu hỏi không nằm trong lượt thi (ERR_QUESTION_NOT_IN_ATTEMPT)',
    }),
    ApiForbiddenResponse({
      description:
        'Không có quyền báo cáo trên lượt thi của người khác (ERR_FORBIDDEN_ATTEMPT_ACCESS)',
    }),
    ApiNotFoundResponse({
      description:
        'Không tìm thấy câu hỏi (ERR_QUESTION_NOT_FOUND) hoặc lượt thi (ERR_ATTEMPT_NOT_FOUND)',
    }),
    ApiConflictResponse({
      description:
        'Đã tồn tại báo cáo đang mở (pending/in_review) của học viên này cho cùng câu hỏi (ERR_DUPLICATE_OPEN_REPORT)',
    }),
  );

export const ApiGetMyQuestionReportsDoc = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Học viên xem danh sách báo cáo câu hỏi của bản thân (UC29)',
      description:
        'Theo dõi trạng thái xử lý và ghi chú phản hồi (resolutionNote) cho các báo cáo do chính học viên gửi (ẩn danh tính giáo viên xử lý).',
    }),
    ApiOkResponse({
      description: 'Lấy danh sách báo cáo cá nhân thành công',
      type: PaginatedMyQuestionReportsResponseDto,
    }),
    ApiBadRequestResponse({
      description: 'Tham số phân trang hoặc bộ lọc không hợp lệ',
    }),
  );

export const ApiGetQuestionReportsDoc = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Giáo viên/Admin xem danh sách báo cáo câu hỏi (UC49)',
      description:
        'Tra cứu danh sách phân trang các báo cáo lỗi câu hỏi kèm bộ lọc status, reason, questionId.',
    }),
    ApiOkResponse({
      description: 'Lấy danh sách báo cáo thành công',
      type: PaginatedAdminQuestionReportsResponseDto,
    }),
    ApiBadRequestResponse({
      description: 'Tham số lọc không hợp lệ',
    }),
    ApiForbiddenResponse({
      description: 'Chỉ Giáo viên hoặc Quản trị viên mới có quyền truy cập',
    }),
  );

export const ApiGetQuestionReportDetailDoc = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Giáo viên/Admin xem chi tiết báo cáo kèm ngữ cảnh câu hỏi & nhóm (UC49)',
      description:
        'Hiển thị toàn bộ nội dung báo cáo, câu hỏi, phương án (Rule #1002), giải thích và nhóm đoạn văn/hội thoại (questionGroup).',
    }),
    ApiParam({
      name: 'id',
      format: 'uuid',
      description: 'ID báo cáo câu hỏi',
    }),
    ApiOkResponse({
      description: 'Lấy chi tiết báo cáo thành công',
      type: QuestionReportDetailResponseDto,
    }),
    ApiForbiddenResponse({
      description: 'Chỉ Giáo viên hoặc Quản trị viên mới có quyền truy cập',
    }),
    ApiNotFoundResponse({
      description: 'Không tìm thấy báo cáo câu hỏi (ERR_REPORT_NOT_FOUND)',
    }),
  );

export const ApiResolveQuestionReportDoc = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Giáo viên/Admin cập nhật trạng thái xử lý báo cáo câu hỏi (UC49)',
      description:
        'Chuyển trạng thái báo cáo bằng Atomic Conditional Update (pending -> in_review giữ resolvedBy/resolvedAt = null; pending/in_review -> resolved/rejected bắt buộc resolutionNote 10–1000 ký tự). Hỗ trợ resolveAllForQuestion để đóng hàng loạt các báo cáo mở khác của cùng câu hỏi.',
    }),
    ApiParam({
      name: 'id',
      format: 'uuid',
      description: 'ID báo cáo câu hỏi',
    }),
    ApiOkResponse({
      description: 'Cập nhật xử lý báo cáo thành công',
      type: ResolveQuestionReportResponseDto,
    }),
    ApiBadRequestResponse({
      description:
        'Chuyển trạng thái không hợp lệ (ERR_INVALID_REPORT_STATUS_TRANSITION) hoặc báo cáo đã đóng (ERR_REPORT_ALREADY_CLOSED)',
    }),
    ApiForbiddenResponse({
      description: 'Chỉ Giáo viên hoặc Quản trị viên mới có quyền xử lý báo cáo',
    }),
    ApiNotFoundResponse({
      description: 'Không tìm thấy báo cáo câu hỏi (ERR_REPORT_NOT_FOUND)',
    }),
  );
