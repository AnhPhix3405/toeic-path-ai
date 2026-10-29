import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ExamAttempt } from '../entities/exam-attempt.entity';
import { ExamAttemptSnapshot } from '../entities/exam-attempt-snapshot.entity';
import { ExamAttemptAnswer } from '../entities/exam-attempt-answer.entity';
import { ExamAttemptStatus } from '../enums/exam-attempt-status.enum';
import { SaveAnswerDto } from '../dto/request/save-answer.dto';
import { BatchAnswerItemDto, BatchSaveAnswersDto } from '../dto/request/batch-save-answers.dto';
import { SaveAnswerResponseDto } from '../dto/response/save-answer-response.dto';
import {
  BatchSaveAnswersResponseDto,
  FailedBatchItemDto,
} from '../dto/response/batch-save-answers-response.dto';

interface SnapshotOption {
  id: string;
  label: string;
  content?: string | null;
}

interface SnapshotQuestion {
  id: string;
  options?: SnapshotOption[];
}

@Injectable()
export class ExamAttemptsAnswersService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(ExamAttempt)
    private readonly examAttemptRepository: Repository<ExamAttempt>,
    @InjectRepository(ExamAttemptSnapshot)
    private readonly examAttemptSnapshotRepository: Repository<ExamAttemptSnapshot>,
    @InjectRepository(ExamAttemptAnswer)
    private readonly examAttemptAnswerRepository: Repository<ExamAttemptAnswer>,
  ) {}

  /**
   * Helper kiểm tra và xác thực tính hợp lệ của lượt thi khi lưu câu trả lời (PMR 023).
   * Tuyệt đối không cho phép Admin/Teacher can thiệp thay thí sinh.
   */
  private async getValidAttemptForSave(attemptId: string, userId: string): Promise<ExamAttempt> {
    const attempt = await this.examAttemptRepository.findOne({
      where: { id: attemptId },
    });

    if (!attempt) {
      throw new NotFoundException({
        errorCode: 'ERR_ATTEMPT_NOT_FOUND',
        message: 'Không tìm thấy lượt làm bài thi',
      });
    }

    // PMR 023: Siết chặt an ninh bài thi, chỉ chủ sở hữu được lưu đáp án
    if (attempt.userId !== userId) {
      throw new ForbiddenException({
        errorCode: 'ERR_FORBIDDEN_ATTEMPT_ACCESS',
        message: 'Bạn không có quyền lưu câu trả lời cho bài thi này.',
      });
    }

    if (attempt.status !== ExamAttemptStatus.IN_PROGRESS) {
      throw new BadRequestException({
        errorCode: 'ERR_ATTEMPT_NOT_IN_PROGRESS',
        message: 'Lượt làm bài không ở trạng thái đang làm',
      });
    }

    // Chốt chặn thời gian thực kèm 30s Grace Period cố định
    const now = new Date();
    if (now.getTime() > attempt.expiresAt.getTime() + 30000) {
      throw new BadRequestException({
        errorCode: 'ERR_ATTEMPT_EXPIRED',
        message: 'Thời gian làm bài đã hết (bao gồm thời gian ân hạn)',
      });
    }

    return attempt;
  }

  /**
   * Helper nạp Snapshot đề thi và index Map các câu hỏi cùng options để tra cứu O(1).
   */
  private async getSnapshotQuestionMap(attemptId: string): Promise<Map<string, Set<string>>> {
    const snapshot = await this.examAttemptSnapshotRepository.findOne({
      where: { attemptId },
      select: { id: true, shuffledQuestions: true },
    });

    if (!snapshot) {
      throw new NotFoundException({
        errorCode: 'ERR_SNAPSHOT_NOT_FOUND',
        message: 'Không tìm thấy bản đóng băng đề thi của lượt này',
      });
    }

    const questionMap = new Map<string, Set<string>>();
    const rawQuestions = (snapshot.shuffledQuestions || []) as unknown as SnapshotQuestion[];
    for (const q of rawQuestions) {
      const optionIds = new Set<string>((q.options || []).map((o) => o.id));
      questionMap.set(q.id, optionIds);
    }

    return questionMap;
  }

  /**
   * Lưu câu trả lời đơn lẻ real-time (UC22).
   * - Conditional Upsert chống xóa đè đáp án khi chỉ toggle review flag.
   * - Atomic raw SQL counter với RETURNING answered_count chống Optimistic Lock conflict.
   */
  async saveAnswer(
    userId: string,
    attemptId: string,
    dto: SaveAnswerDto,
  ): Promise<SaveAnswerResponseDto> {
    const attempt = await this.getValidAttemptForSave(attemptId, userId);

    // 1. Thẩm định câu hỏi và option đối chiếu Snapshot
    const questionMap = await this.getSnapshotQuestionMap(attemptId);
    const validOptionIds = questionMap.get(dto.questionId);

    if (!validOptionIds) {
      throw new BadRequestException({
        errorCode: 'ERR_QUESTION_NOT_IN_ATTEMPT',
        message: 'Câu hỏi không thuộc đề thi của lượt làm bài này',
      });
    }

    if (dto.selectedOptionId && !validOptionIds.has(dto.selectedOptionId)) {
      throw new BadRequestException({
        errorCode: 'ERR_INVALID_OPTION_CHOICE',
        message: 'Phương án lựa chọn không hợp lệ cho câu hỏi này',
      });
    }

    // 2. Chuẩn hóa tham số để tránh lỗi driver pg với giá trị undefined (PMR 023)
    const isOptionProvided = dto.selectedOptionId !== undefined;
    const isReviewProvided = dto.isMarkedForReview !== undefined;

    await this.dataSource.query(
      `INSERT INTO exam_attempt_answers (
        attempt_id, question_id, selected_option_id, is_marked_for_review, answered_at, time_spent_seconds
      ) VALUES (
        $1, $2, $3, COALESCE($4, false), NOW(), COALESCE($5, 0)
      )
      ON CONFLICT (attempt_id, question_id) DO UPDATE SET
        selected_option_id = CASE WHEN $6 = true THEN EXCLUDED.selected_option_id ELSE exam_attempt_answers.selected_option_id END,
        is_marked_for_review = CASE WHEN $7 = true THEN EXCLUDED.is_marked_for_review ELSE exam_attempt_answers.is_marked_for_review END,
        time_spent_seconds = exam_attempt_answers.time_spent_seconds + EXCLUDED.time_spent_seconds,
        answered_at = NOW();`,
      [
        attemptId,
        dto.questionId,
        dto.selectedOptionId ?? null,
        dto.isMarkedForReview ?? null,
        dto.timeSpentSeconds ?? 0,
        isOptionProvided,
        isReviewProvided,
      ],
    );

    // 3. Cập nhật answered_count nguyên tử và lấy kết quả qua RETURNING (PMR 023)
    const updateResult = await this.dataSource.query<Array<{ answered_count: number }>>(
      `UPDATE exam_attempts
       SET answered_count = (
         SELECT COUNT(1) FROM exam_attempt_answers
         WHERE attempt_id = $1 AND selected_option_id IS NOT NULL
       ),
       updated_at = NOW()
       WHERE id = $1
       RETURNING answered_count;`,
      [attemptId],
    );

    const answeredCount = Number(updateResult[0]?.answered_count ?? 0);
    const remainingSeconds = Math.max(
      0,
      Math.floor((attempt.expiresAt.getTime() - Date.now()) / 1000),
    );

    return {
      success: true,
      questionId: dto.questionId,
      selectedOptionId: dto.selectedOptionId ?? null,
      isMarkedForReview: dto.isMarkedForReview ?? false,
      answeredCount,
      remainingSeconds,
      savedAt: new Date(),
    };
  }

  /**
   * Đồng bộ hàng loạt câu trả lời sau khi phục hồi mạng từ IndexedDB/LocalStorage (UC22).
   * - In-Memory Pre-Validation chống vỡ Database Transaction khi 1 câu sai ID.
   * - Multi-row Upsert tối ưu hiệu năng I/O.
   * - Chronology Sync bảo toàn clientAnsweredAt.
   */
  async batchSaveAnswers(
    userId: string,
    attemptId: string,
    dto: BatchSaveAnswersDto,
  ): Promise<BatchSaveAnswersResponseDto> {
    const attempt = await this.getValidAttemptForSave(attemptId, userId);
    const now = new Date();

    // 1. In-Memory Pre-Validation đối chiếu Snapshot
    const questionMap = await this.getSnapshotQuestionMap(attemptId);
    const validAnswers: BatchAnswerItemDto[] = [];
    const failedItems: FailedBatchItemDto[] = [];

    for (const item of dto.answers) {
      const validOptionIds = questionMap.get(item.questionId);
      if (!validOptionIds) {
        failedItems.push({
          questionId: item.questionId,
          reason: 'ERR_QUESTION_NOT_IN_ATTEMPT',
        });
        continue;
      }
      if (item.selectedOptionId && !validOptionIds.has(item.selectedOptionId)) {
        failedItems.push({
          questionId: item.questionId,
          reason: 'ERR_INVALID_OPTION_CHOICE',
        });
        continue;
      }
      validAnswers.push(item);
    }

    // 2. Thực thi Multi-row Upsert cho các câu hợp lệ (PMR 023)
    if (validAnswers.length > 0) {
      // Phân tách thành 2 nhóm: nhóm cập nhật option (có thể kèm review) và nhóm chỉ toggle review
      const answersWithOptions = validAnswers.filter((a) => a.selectedOptionId !== undefined);
      const reviewOnlyAnswers = validAnswers.filter((a) => a.selectedOptionId === undefined);

      if (answersWithOptions.length > 0) {
        const valueClauses: string[] = [];
        const params: unknown[] = [attemptId];
        let pIndex = 2;

        for (const ans of answersWithOptions) {
          let answeredAt = now;
          if (ans.clientAnsweredAt) {
            const clientDate = new Date(ans.clientAnsweredAt);
            if (
              !isNaN(clientDate.getTime()) &&
              clientDate >= attempt.startedAt &&
              clientDate <= now
            ) {
              answeredAt = clientDate;
            }
          }

          valueClauses.push(
            `($1, $${pIndex}, $${pIndex + 1}, COALESCE($${pIndex + 2}, false), $${pIndex + 3}, COALESCE($${pIndex + 4}, 0))`,
          );
          params.push(
            ans.questionId,
            ans.selectedOptionId ?? null,
            ans.isMarkedForReview ?? null,
            answeredAt,
            ans.timeSpentSeconds ?? 0,
          );
          pIndex += 5;
        }

        const sql = `
          INSERT INTO exam_attempt_answers (
            attempt_id, question_id, selected_option_id, is_marked_for_review, answered_at, time_spent_seconds
          ) VALUES ${valueClauses.join(', ')}
          ON CONFLICT (attempt_id, question_id) DO UPDATE SET
            selected_option_id = EXCLUDED.selected_option_id,
            is_marked_for_review = EXCLUDED.is_marked_for_review,
            time_spent_seconds = exam_attempt_answers.time_spent_seconds + EXCLUDED.time_spent_seconds,
            answered_at = EXCLUDED.answered_at;
        `;
        await this.dataSource.query(sql, params);
      }

      if (reviewOnlyAnswers.length > 0) {
        const valueClauses: string[] = [];
        const params: unknown[] = [attemptId];
        let pIndex = 2;

        for (const ans of reviewOnlyAnswers) {
          let answeredAt = now;
          if (ans.clientAnsweredAt) {
            const clientDate = new Date(ans.clientAnsweredAt);
            if (
              !isNaN(clientDate.getTime()) &&
              clientDate >= attempt.startedAt &&
              clientDate <= now
            ) {
              answeredAt = clientDate;
            }
          }

          valueClauses.push(
            `($1, $${pIndex}, NULL, COALESCE($${pIndex + 1}, false), $${pIndex + 2}, COALESCE($${pIndex + 3}, 0))`,
          );
          params.push(
            ans.questionId,
            ans.isMarkedForReview ?? null,
            answeredAt,
            ans.timeSpentSeconds ?? 0,
          );
          pIndex += 4;
        }

        const sql = `
          INSERT INTO exam_attempt_answers (
            attempt_id, question_id, selected_option_id, is_marked_for_review, answered_at, time_spent_seconds
          ) VALUES ${valueClauses.join(', ')}
          ON CONFLICT (attempt_id, question_id) DO UPDATE SET
            is_marked_for_review = EXCLUDED.is_marked_for_review,
            time_spent_seconds = exam_attempt_answers.time_spent_seconds + EXCLUDED.time_spent_seconds,
            answered_at = EXCLUDED.answered_at;
        `;
        await this.dataSource.query(sql, params);
      }

      // Cập nhật answered_count nguyên tử
      await this.dataSource.query(
        `UPDATE exam_attempts
         SET answered_count = (
           SELECT COUNT(1) FROM exam_attempt_answers
           WHERE attempt_id = $1 AND selected_option_id IS NOT NULL
         ),
         updated_at = NOW()
         WHERE id = $1;`,
        [attemptId],
      );
    }

    // 3. Đọc answeredCount tức thời từ CSDL
    const countResult = await this.dataSource.query<Array<{ answered_count: number }>>(
      `SELECT answered_count FROM exam_attempts WHERE id = $1;`,
      [attemptId],
    );
    const answeredCount = Number(countResult[0]?.answered_count ?? attempt.answeredCount ?? 0);

    const remainingSeconds = Math.max(
      0,
      Math.floor((attempt.expiresAt.getTime() - now.getTime()) / 1000),
    );

    return {
      success: true,
      syncedCount: validAnswers.length,
      failedCount: failedItems.length,
      failedItems,
      answeredCount,
      remainingSeconds,
      serverTimeNow: now,
    };
  }
}
