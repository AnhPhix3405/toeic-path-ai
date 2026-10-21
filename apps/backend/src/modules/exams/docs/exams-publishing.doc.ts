import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { ChangeExamStatusDto } from '../dto/request/change-exam-status.dto';
import { ExamPublishResultResponseDto } from '../dto/response/exam-publish-result-response.dto';

export function ApiExamsPublishingControllerDoc() {
  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiForbiddenResponse({
      description: 'Chỉ giáo viên sở hữu đề thi hoặc Quản trị viên (Admin) mới có quyền thao tác.',
      schema: {
        example: {
          statusCode: 403,
          message: 'Bạn không có quyền thao tác trên đề thi này.',
          code: 'ERR_FORBIDDEN_EXAM_ACCESS',
        },
      },
    }),
    ApiNotFoundResponse({
      description: 'Không tìm thấy đề thi với ID cung cấp.',
      schema: {
        example: {
          statusCode: 404,
          message: 'Không tìm thấy đề thi',
        },
      },
    }),
    ApiConflictResponse({
      description: 'Xung đột phiên chỉnh sửa đồng thời (Optimistic Locking Concurrency Conflict).',
      schema: {
        example: {
          statusCode: 409,
          message: 'Đề thi đã bị thay đổi bởi phiên làm việc khác. Vui lòng làm mới trang.',
          code: 'ERR_CONCURRENCY_CONFLICT',
        },
      },
    }),
    ApiTooManyRequestsResponse({
      description:
        'Vượt quá hạn ngạch tần suất gọi API thay đổi trạng thái đề thi (Rate limit mutate).',
    }),
  );
}

export function ApiPublishExamDoc() {
  return applyDecorators(
    ApiOperation({
      summary: 'Xuất bản đề thi (Draft -> Published) (UC18)',
      description:
        'Kích hoạt Publish Checklist Validator kiểm tra toàn vẹn đề thi (Full Test 200 câu/7 Part, Placement Test 20-100 câu đủ 2 kỹ năng, Single Choice Invariant, Media Image & Audio không nghẽn I/O qua DB metadata). Chuyển sang published, cập nhật publishedAt và tính cờ isScheduled nếu openAt ở tương lai.',
    }),
    ApiBody({ type: ChangeExamStatusDto }),
    ApiOkResponse({
      description: 'Xuất bản đề thi thành công.',
      type: ExamPublishResultResponseDto,
    }),
  );
}

export function ApiUnpublishExamDoc() {
  return applyDecorators(
    ApiOperation({
      summary: 'Chuyển đề thi về lại bản nháp (Published -> Draft) (UC18)',
      description:
        'Unpublish Guard: Cho phép đưa đề thi đã xuất bản về lại bản nháp để chỉnh sửa CHỈ KHI chưa phát sinh bất kỳ lượt làm bài nào (attemptsCount === 0). Từ chối nếu đã có thí sinh tham gia (ERR_EXAM_HAS_ATTEMPTS).',
    }),
    ApiBody({ type: ChangeExamStatusDto }),
    ApiOkResponse({
      description: 'Chuyển đề thi về bản nháp thành công.',
      type: ExamPublishResultResponseDto,
    }),
  );
}

export function ApiCloseExamDoc() {
  return applyDecorators(
    ApiOperation({
      summary: 'Đóng đề thi thủ công (Published -> Closed) (UC18)',
      description:
        'Đóng đề thi đang phát hành. Cho phép thí sinh đang làm bài dở dang nộp nốt trong thời lượng còn lại, nhưng chặn toàn bộ lượt làm bài mới.',
    }),
    ApiBody({ type: ChangeExamStatusDto }),
    ApiOkResponse({
      description: 'Đóng đề thi thành công.',
      type: ExamPublishResultResponseDto,
    }),
  );
}

export function ApiArchiveExamDoc() {
  return applyDecorators(
    ApiOperation({
      summary: 'Lưu trữ đề thi vĩnh viễn (Closed/Draft -> Archived) (UC18)',
      description:
        'Đưa đề thi vào chế độ lưu trữ vĩnh viễn. Đề thi bị ẩn khỏi danh mục công khai nhưng vẫn lưu trữ dữ liệu để phục vụ báo cáo thống kê lịch sử.',
    }),
    ApiBody({ type: ChangeExamStatusDto }),
    ApiOkResponse({
      description: 'Lưu trữ đề thi thành công.',
      type: ExamPublishResultResponseDto,
    }),
  );
}
