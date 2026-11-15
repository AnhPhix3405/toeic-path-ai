import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ExamAttempt } from '../entities/exam-attempt.entity';
import { ExamAttemptStatus } from '../enums/exam-attempt-status.enum';
import { SubmitExamAttemptResponseDto } from '../dto/response/submit-exam-attempt-response.dto';
import { ExamAttemptsGradingService } from './exam-attempts-grading.service';

export const GRACE_PERIOD_SECONDS = 30;
export const AUTO_SUBMIT_BATCH_SIZE = 100;
export const AUTO_SUBMIT_MAX_DRAIN = 500;

@Injectable()
export class ExamAttemptsSubmissionService {
  private readonly logger = new Logger(ExamAttemptsSubmissionService.name);
  private isCronRunning = false;

  constructor(
    @InjectRepository(ExamAttempt)
    private readonly examAttemptRepository: Repository<ExamAttempt>,
    private readonly gradingService: ExamAttemptsGradingService,
    private readonly dataSource: DataSource,
  ) {}

  async submitAttempt(userId: string, attemptId: string): Promise<SubmitExamAttemptResponseDto> {
    const attempt = await this.examAttemptRepository.findOne({
      where: { id: attemptId },
    });

    if (!attempt) {
      throw new NotFoundException({
        errorCode: 'ERR_ATTEMPT_NOT_FOUND',
        message: 'Không tìm thấy lượt làm bài thi',
      });
    }

    if (attempt.userId !== userId) {
      throw new ForbiddenException({
        errorCode: 'ERR_FORBIDDEN_ATTEMPT_ACCESS',
        message: 'Chỉ học viên sở hữu lượt thi mới được phép nộp bài',
      });
    }

    this.ensureAttemptSubmittable(attempt);

    const gradedAttempt = await this.dataSource.transaction(async (manager) => {
      // PMR 029: Khóa độc lập bảng exam_attempts (không join bảng exams)
      const lockedAttempt = await manager.findOne(ExamAttempt, {
        where: { id: attemptId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!lockedAttempt) {
        throw new NotFoundException({
          errorCode: 'ERR_ATTEMPT_NOT_FOUND',
          message: 'Không tìm thấy lượt làm bài thi',
        });
      }

      // Kiểm tra lại trạng thái sau khi lấy khóa phòng race condition E1/E2
      this.ensureAttemptSubmittable(lockedAttempt);

      // PMR 029: Dùng chung một mốc thời gian now duy nhất
      const now = new Date();
      const isWithinGrace =
        now.getTime() <= lockedAttempt.expiresAt.getTime() + GRACE_PERIOD_SECONDS * 1000;

      lockedAttempt.status = isWithinGrace
        ? ExamAttemptStatus.SUBMITTED
        : ExamAttemptStatus.TIMED_OUT;
      lockedAttempt.submittedAt = now;

      const allocatedSeconds = Math.max(
        0,
        Math.floor((lockedAttempt.expiresAt.getTime() - lockedAttempt.startedAt.getTime()) / 1000),
      );
      const rawSpentSeconds = Math.max(
        0,
        Math.floor((now.getTime() - lockedAttempt.startedAt.getTime()) / 1000),
      );
      lockedAttempt.durationSpentSeconds = Math.min(allocatedSeconds, rawSpentSeconds);

      return this.gradingService.gradeAttemptInTransaction(manager, lockedAttempt, now);
    });

    return this.mapToSubmitResponse(gradedAttempt);
  }

  @Cron('0 * * * * *')
  async handleAutoSubmitExpiredAttempts(): Promise<{
    processed: number;
    succeeded: number;
    failed: number;
  }> {
    if (this.isCronRunning) {
      this.logger.warn('[AutoSubmitCron] Bỏ qua chu kỳ vì tiến trình trước vẫn đang chạy.');
      return { processed: 0, succeeded: 0, failed: 0 };
    }

    this.isCronRunning = true;
    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    try {
      while (processed < AUTO_SUBMIT_MAX_DRAIN) {
        const remainingQuota = AUTO_SUBMIT_MAX_DRAIN - processed;
        const limit = Math.min(AUTO_SUBMIT_BATCH_SIZE, remainingQuota);

        const expiredCandidates = await this.examAttemptRepository
          .createQueryBuilder('attempt')
          .select(['attempt.id'])
          .where('attempt.status = :status', {
            status: ExamAttemptStatus.IN_PROGRESS,
          })
          .andWhere(`attempt.expires_at + INTERVAL '${GRACE_PERIOD_SECONDS} seconds' <= NOW()`)
          .orderBy('attempt.expires_at', 'ASC')
          .limit(limit)
          .getMany();

        if (expiredCandidates.length === 0) {
          break;
        }

        for (const candidate of expiredCandidates) {
          processed++;
          try {
            const didSubmit = await this.autoSubmitSingleAttempt(candidate.id);
            if (didSubmit) {
              succeeded++;
            }
          } catch (error: unknown) {
            failed++;
            this.logger.error(
              `[AutoSubmitCron] Lỗi khi tự động thu bài attemptId=${candidate.id}: ${
                error instanceof Error ? error.message : String(error)
              }`,
            );
          }
        }

        if (expiredCandidates.length < limit) {
          break;
        }
      }

      if (processed > 0) {
        this.logger.log(
          `[AutoSubmitCron] Hoàn tất quét bài thi hết giờ: processed=${processed}, succeeded=${succeeded}, failed=${failed}`,
        );
      }

      return { processed, succeeded, failed };
    } finally {
      this.isCronRunning = false;
    }
  }

  private async autoSubmitSingleAttempt(attemptId: string): Promise<boolean> {
    return this.dataSource.transaction(async (manager) => {
      // PMR 026 & PMR 029: Khóa dòng FOR UPDATE SKIP LOCKED độc lập trên exam_attempts
      const lockedAttempt = await manager
        .getRepository(ExamAttempt)
        .createQueryBuilder('attempt')
        .setLock('pessimistic_write')
        .setOnLocked('skip_locked')
        .where('attempt.id = :id AND attempt.status = :status', {
          id: attemptId,
          status: ExamAttemptStatus.IN_PROGRESS,
        })
        .getOne();

      if (!lockedAttempt) {
        return false;
      }

      const allocatedSeconds = Math.max(
        0,
        Math.floor((lockedAttempt.expiresAt.getTime() - lockedAttempt.startedAt.getTime()) / 1000),
      );

      lockedAttempt.status = ExamAttemptStatus.TIMED_OUT;
      lockedAttempt.submittedAt = lockedAttempt.expiresAt;
      lockedAttempt.durationSpentSeconds = allocatedSeconds;

      await this.gradingService.gradeAttemptInTransaction(manager, lockedAttempt, new Date());

      return true;
    });
  }

  private ensureAttemptSubmittable(attempt: ExamAttempt): void {
    if (
      attempt.status === ExamAttemptStatus.SUBMITTED ||
      attempt.status === ExamAttemptStatus.TIMED_OUT
    ) {
      throw new ConflictException({
        errorCode: 'ERR_ATTEMPT_ALREADY_SUBMITTED',
        message: 'Lượt làm bài đã được nộp trước đó',
        status: attempt.status,
        submittedAt: attempt.submittedAt ?? null,
      });
    }

    if (attempt.status !== ExamAttemptStatus.IN_PROGRESS) {
      throw new BadRequestException({
        errorCode: 'ERR_ATTEMPT_NOT_IN_PROGRESS',
        message: 'Lượt làm bài không ở trạng thái đang làm dở',
      });
    }
  }

  private mapToSubmitResponse(attempt: ExamAttempt): SubmitExamAttemptResponseDto {
    const dto = new SubmitExamAttemptResponseDto();
    dto.attemptId = attempt.id;
    dto.status = attempt.status;
    dto.submittedAt = attempt.submittedAt!;
    dto.durationSpentSeconds = attempt.durationSpentSeconds ?? 0;
    dto.totalScore = attempt.totalScore ?? null;
    dto.listeningScore = attempt.listeningScore ?? null;
    dto.readingScore = attempt.readingScore ?? null;
    dto.correctCount = attempt.correctCount ?? 0;
    dto.wrongCount = attempt.wrongCount ?? 0;
    dto.skippedCount = attempt.skippedCount ?? 0;
    dto.totalQuestions = attempt.totalQuestions;
    dto.accuracyPercentage = attempt.accuracyPercentage ?? 0;
    dto.isPassed = attempt.isPassed ?? null;
    return dto;
  }
}
