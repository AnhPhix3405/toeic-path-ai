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
} from '@nestjs/swagger';
import { ExamAttemptSummaryResponseDto } from '../dto/response/exam-attempt-summary-response.dto';
import { AbandonAttemptResponseDto } from '../dto/response/abandon-attempt-response.dto';
import { ExamAttemptOverviewResponseDto } from '../dto/response/exam-attempt-overview-response.dto';
import { ExamAttemptQuestionsResponseDto } from '../dto/response/exam-attempt-questions-response.dto';

export const ApiExamAttemptsControllerDoc = () => applyDecorators(ApiBearerAuth());

export const ApiStartAttemptDoc = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Bắt đầu hoặc khôi phục lượt làm bài thi (UC20)',
      description:
        'Khởi tạo lượt thi mới (201 Created) hoặc khôi phục lượt thi dở dang cùng đề (200 OK). Đóng băng Snapshot đề thi và bảo toàn QuestionGroup Integrity.',
    }),
    ApiCreatedResponse({
      description: 'Khởi tạo lượt thi mới thành công',
      type: ExamAttemptSummaryResponseDto,
    }),
    ApiOkResponse({
      description: 'Khôi phục thành công lượt thi dở dang trên chính đề này (isResumed: true)',
      type: ExamAttemptSummaryResponseDto,
    }),
    ApiConflictResponse({
      description:
        'Học viên đang có lượt thi dở dang ở một đề thi khác (ERR_ANOTHER_EXAM_IN_PROGRESS)',
    }),
    ApiBadRequestResponse({
      description:
        'Dữ liệu không hợp lệ hoặc đề không cho phép luyện tập theo Part (ERR_PART_PRACTICE_NOT_ALLOWED)',
    }),
    ApiForbiddenResponse({
      description:
        'Đề chưa mở, đã đóng, hoặc vượt quá số lượt thi tối đa (ERR_MAX_ATTEMPTS_EXCEEDED)',
    }),
    ApiNotFoundResponse({
      description: 'Đề thi không tồn tại hoặc chưa xuất bản (ERR_EXAM_NOT_AVAILABLE)',
    }),
  );

export const ApiAbandonAttemptDoc = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Hủy bỏ lượt làm bài thi dở dang (UC20)',
      description:
        'Chuyển trạng thái lượt thi từ in_progress sang abandoned để giải phóng Single Active Attempt Invariant.',
    }),
    ApiOkResponse({
      description: 'Hủy lượt thi thành công',
      type: AbandonAttemptResponseDto,
    }),
    ApiBadRequestResponse({
      description: 'Lượt thi không ở trạng thái in_progress (ERR_ATTEMPT_NOT_IN_PROGRESS)',
    }),
    ApiForbiddenResponse({
      description: 'Người dùng không có quyền hủy lượt thi này (ERR_FORBIDDEN_ATTEMPT_ACCESS)',
    }),
    ApiNotFoundResponse({
      description: 'Không tìm thấy lượt thi (ERR_ATTEMPT_NOT_FOUND)',
    }),
  );

export const ApiGetAttemptOverviewDoc = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Lấy thông tin tổng quan bài thi và ma trận tiến độ (UC21)',
      description:
        'Cung cấp ma trận câu hỏi (1..N) trạng thái isAnswered, cờ isExpired, remainingSeconds và serverTimeNow để đồng bộ countdown timer. Anti memory-leak.',
    }),
    ApiOkResponse({
      description: 'Lấy thông tin tổng quan bài thi thành công',
      type: ExamAttemptOverviewResponseDto,
    }),
    ApiForbiddenResponse({
      description: 'Không có quyền truy cập lượt thi này (ERR_FORBIDDEN_ATTEMPT_ACCESS)',
    }),
    ApiNotFoundResponse({
      description:
        'Không tìm thấy lượt thi (ERR_ATTEMPT_NOT_FOUND) hoặc Snapshot (ERR_SNAPSHOT_NOT_FOUND)',
    }),
  );

export const ApiGetAttemptQuestionsDoc = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Tải nội dung câu hỏi phân trang theo Part kèm khôi phục phiên (UC21)',
      description:
        'Trả về danh sách QuestionGroups (split-view deduplicated) và Questions kèm câu trả lời đã lưu và cờ isFlagged.',
    }),
    ApiOkResponse({
      description: 'Tải nội dung câu hỏi thành công',
      type: ExamAttemptQuestionsResponseDto,
    }),
    ApiBadRequestResponse({
      description: 'Part yêu cầu không nằm trong lượt thi này (ERR_PART_NOT_IN_ATTEMPT)',
    }),
    ApiForbiddenResponse({
      description: 'Không có quyền truy cập lượt thi này (ERR_FORBIDDEN_ATTEMPT_ACCESS)',
    }),
    ApiNotFoundResponse({
      description:
        'Không tìm thấy lượt thi (ERR_ATTEMPT_NOT_FOUND) hoặc Snapshot (ERR_SNAPSHOT_NOT_FOUND)',
    }),
  );
