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
import { SaveAnswerResponseDto } from '../dto/response/save-answer-response.dto';
import { BatchSaveAnswersResponseDto } from '../dto/response/batch-save-answers-response.dto';
import { SubmitExamAttemptResponseDto } from '../dto/response/submit-exam-attempt-response.dto';
import { ExamAttemptResultResponseDto } from '../dto/response/exam-attempt-result-response.dto';
import { PaginatedExamAttemptHistoryResponseDto } from '../dto/response/exam-attempt-history-response.dto';
import { ExamAttemptReviewResponseDto } from '../dto/response/exam-attempt-review-response.dto';

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

export const ApiSaveAnswerDoc = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Tự động lưu câu trả lời hoặc cờ đánh dấu xem lại (UC22)',
      description:
        'Lưu câu trả lời real-time với Conditional Upsert chống xóa đè đáp án khi toggle review flag và atomic counter chống lỗi xung đột khóa lạc quan.',
    }),
    ApiOkResponse({
      description: 'Lưu câu trả lời thành công',
      type: SaveAnswerResponseDto,
    }),
    ApiBadRequestResponse({
      description:
        'Trạng thái không hợp lệ, hết giờ hoặc câu hỏi/phương án không hợp lệ (ERR_ATTEMPT_NOT_IN_PROGRESS, ERR_ATTEMPT_EXPIRED, ERR_QUESTION_NOT_IN_ATTEMPT, ERR_INVALID_OPTION_CHOICE)',
    }),
    ApiForbiddenResponse({
      description:
        'Chỉ thí sinh sở hữu lượt thi mới được phép lưu đáp án (ERR_FORBIDDEN_ATTEMPT_ACCESS)',
    }),
    ApiNotFoundResponse({
      description:
        'Không tìm thấy lượt thi (ERR_ATTEMPT_NOT_FOUND) hoặc Snapshot (ERR_SNAPSHOT_NOT_FOUND)',
    }),
  );

export const ApiBatchSaveAnswersDoc = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Đồng bộ hàng loạt câu trả lời sau khi phục hồi kết nối mạng (UC22)',
      description:
        'Xử lý đồng bộ theo lô với in-memory pre-validation đối chiếu Snapshot và Multi-row Upsert chống vỡ transaction.',
    }),
    ApiOkResponse({
      description: 'Đồng bộ hàng loạt câu trả lời thành công',
      type: BatchSaveAnswersResponseDto,
    }),
    ApiBadRequestResponse({
      description:
        'Trạng thái không hợp lệ hoặc hết giờ (ERR_ATTEMPT_NOT_IN_PROGRESS, ERR_ATTEMPT_EXPIRED)',
    }),
    ApiForbiddenResponse({
      description:
        'Chỉ thí sinh sở hữu lượt thi mới được phép lưu đáp án (ERR_FORBIDDEN_ATTEMPT_ACCESS)',
    }),
    ApiNotFoundResponse({
      description:
        'Không tìm thấy lượt thi (ERR_ATTEMPT_NOT_FOUND) hoặc Snapshot (ERR_SNAPSHOT_NOT_FOUND)',
    }),
  );

export const ApiSubmitAttemptDoc = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Nộp bài thi thủ công và kích hoạt chấm điểm tức thì (UC23)',
      description:
        'Chốt trạng thái lượt thi (submitted nếu trong 30s Grace Period, timed_out nếu quá hạn), tính durationSpentSeconds chặn trần theo allocatedSeconds và chấm điểm TOEIC tự động (UC25).',
    }),
    ApiOkResponse({
      description: 'Nộp bài và chấm điểm thành công',
      type: SubmitExamAttemptResponseDto,
    }),
    ApiBadRequestResponse({
      description: 'Lượt thi đã bị hủy (abandoned) (ERR_ATTEMPT_NOT_IN_PROGRESS)',
    }),
    ApiForbiddenResponse({
      description:
        'Chỉ học viên sở hữu lượt thi mới được phép nộp bài (ERR_FORBIDDEN_ATTEMPT_ACCESS)',
    }),
    ApiNotFoundResponse({
      description: 'Không tìm thấy lượt thi (ERR_ATTEMPT_NOT_FOUND)',
    }),
    ApiConflictResponse({
      description: 'Lượt thi đã được nộp trước đó (ERR_ATTEMPT_ALREADY_SUBMITTED)',
    }),
  );

export const ApiGetAttemptHistoryDoc = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Xem lịch sử làm bài thi của học viên (UC27)',
      description:
        'Tra cứu danh sách phân trang các lượt làm bài của bản thân kèm bộ lọc examId, mode, status, fromDate, toDate. Không tải cột JSONB nặng để tối ưu hiệu năng.',
    }),
    ApiOkResponse({
      description: 'Lấy lịch sử làm bài thành công',
      type: PaginatedExamAttemptHistoryResponseDto,
    }),
    ApiBadRequestResponse({
      description:
        'Tham số lọc không hợp lệ hoặc khoảng thời gian bị ngược (ERR_INVALID_DATE_RANGE)',
    }),
  );

export const ApiGetAttemptResultDoc = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Xem kết quả tổng quan bài thi và phân tích năng lực (UC26)',
      description:
        'Hiển thị báo cáo điểm số TOEIC (Listening, Reading, Total), tỷ lệ chính xác, thời gian làm bài và phân tích chi tiết theo từng Part (partBreakdown) và kỹ năng (skillBreakdown).',
    }),
    ApiOkResponse({
      description: 'Lấy kết quả bài thi thành công',
      type: ExamAttemptResultResponseDto,
    }),
    ApiBadRequestResponse({
      description:
        'Lượt thi chưa được nộp (in_progress hoặc abandoned) (ERR_ATTEMPT_NOT_SUBMITTED)',
    }),
    ApiForbiddenResponse({
      description: 'Không có quyền xem kết quả lượt thi này (ERR_FORBIDDEN_ATTEMPT_ACCESS)',
    }),
    ApiNotFoundResponse({
      description: 'Không tìm thấy lượt thi (ERR_ATTEMPT_NOT_FOUND)',
    }),
    ApiConflictResponse({
      description: 'Lượt thi chưa hoàn tất chấm điểm (ERR_ATTEMPT_NOT_GRADED)',
    }),
  );

export const ApiGetAttemptReviewDoc = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Xem đáp án, lời giải và lời thoại chi tiết sau khi nộp bài (UC28)',
      description:
        'Đối chiếu lựa chọn của học viên với đáp án đúng (giữ nguyên thứ tự A–D đã xáo trộn từ Snapshot), xem explanation/transcript và lọc theo Part hoặc trạng thái (all, correct, wrong, skipped, marked).',
    }),
    ApiOkResponse({
      description: 'Lấy chi tiết lời giải bài thi thành công',
      type: ExamAttemptReviewResponseDto,
    }),
    ApiBadRequestResponse({
      description:
        'Lượt thi chưa được nộp (ERR_ATTEMPT_NOT_SUBMITTED) hoặc Part yêu cầu không nằm trong lượt luyện tập (ERR_PART_NOT_IN_ATTEMPT)',
    }),
    ApiForbiddenResponse({
      description: 'Không có quyền xem lời giải lượt thi này (ERR_FORBIDDEN_ATTEMPT_ACCESS)',
    }),
    ApiNotFoundResponse({
      description: 'Không tìm thấy lượt thi (ERR_ATTEMPT_NOT_FOUND)',
    }),
    ApiConflictResponse({
      description: 'Lượt thi chưa hoàn tất chấm điểm (ERR_ATTEMPT_NOT_GRADED)',
    }),
  );
