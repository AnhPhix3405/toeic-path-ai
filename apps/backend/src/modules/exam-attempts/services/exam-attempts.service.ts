import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Exam } from '../../exams/entities/exam.entity';
import { ExamStatus } from '../../exams/enums/exam-status.enum';
import { ExamAttempt } from '../entities/exam-attempt.entity';
import { ExamAttemptSnapshot } from '../entities/exam-attempt-snapshot.entity';
import { CreateExamAttemptDto } from '../dto/request/create-exam-attempt.dto';
import { ExamAttemptSummaryResponseDto } from '../dto/response/exam-attempt-summary-response.dto';
import { AbandonAttemptResponseDto } from '../dto/response/abandon-attempt-response.dto';
import { PartPracticeMode } from '../enums/part-practice-mode.enum';
import { ExamAttemptStatus } from '../enums/exam-attempt-status.enum';
import { SnapshotService } from './snapshot.service';

@Injectable()
export class ExamAttemptsService {
  constructor(
    @InjectRepository(Exam)
    private readonly examRepository: Repository<Exam>,
    @InjectRepository(ExamAttempt)
    private readonly examAttemptRepository: Repository<ExamAttempt>,
    @InjectRepository(ExamAttemptSnapshot)
    private readonly examAttemptSnapshotRepository: Repository<ExamAttemptSnapshot>,
    private readonly snapshotService: SnapshotService,
    private readonly dataSource: DataSource,
  ) {}

  async startAttempt(
    userId: string,
    dto: CreateExamAttemptDto,
    ipAddress?: string,
  ): Promise<ExamAttemptSummaryResponseDto> {
    const now = new Date();

    // 1. Kiểm tra đề thi tồn tại, published và chưa bị xóa mềm
    const exam = await this.examRepository.findOne({
      where: { id: dto.examId, isDeleted: false },
      relations: { sections: { part: true } },
    });

    if (!exam || exam.status !== ExamStatus.PUBLISHED) {
      throw new NotFoundException({
        errorCode: 'ERR_EXAM_NOT_AVAILABLE',
        message: 'Đề thi không tồn tại hoặc chưa được xuất bản',
      });
    }

    // 2. Kiểm tra khung giờ mở đề thi
    if (exam.openAt && exam.openAt > now) {
      throw new ForbiddenException({
        errorCode: 'ERR_EXAM_NOT_YET_OPEN',
        message: 'Đề thi chưa đến thời gian mở',
      });
    }

    if (exam.closeAt && exam.closeAt <= now) {
      throw new ForbiddenException({
        errorCode: 'ERR_EXAM_CLOSED',
        message: 'Đề thi đã kết thúc thời gian làm bài',
      });
    }

    // 3. Single Active Attempt Invariant: Quét tìm attempt đang in_progress
    const activeAttempt = await this.examAttemptRepository.findOne({
      where: { userId, status: ExamAttemptStatus.IN_PROGRESS },
      relations: { exam: true },
    });

    if (activeAttempt) {
      if (activeAttempt.examId === exam.id) {
        // Cùng đề thi: Trả về HTTP 200 OK với isResumed: true
        return this.mapToSummaryResponse(activeAttempt, true);
      }

      // Khác đề thi: Ném HTTP 409 Conflict với metadata bài cũ
      throw new ConflictException({
        errorCode: 'ERR_ANOTHER_EXAM_IN_PROGRESS',
        message: 'Bạn đang có một bài thi dở dang ở đề thi khác',
        attemptId: activeAttempt.id,
        examTitle: activeAttempt.exam?.title ?? 'Đề thi khác',
        startedAt: activeAttempt.startedAt,
        remainingSeconds: Math.max(
          0,
          Math.floor((activeAttempt.expiresAt.getTime() - now.getTime()) / 1000),
        ),
      });
    }

    // 4. Kiểm tra giới hạn số lần thi max_attempts (chỉ cho full_exam)
    if (dto.mode === PartPracticeMode.FULL_EXAM && exam.maxAttempts && exam.maxAttempts > 0) {
      const usedAttempts = await this.examAttemptRepository.count({
        where: {
          userId,
          examId: exam.id,
          mode: PartPracticeMode.FULL_EXAM,
          status: In([
            ExamAttemptStatus.SUBMITTED,
            ExamAttemptStatus.TIMED_OUT,
            ExamAttemptStatus.ABANDONED,
          ]),
        },
      });

      if (usedAttempts >= exam.maxAttempts) {
        throw new ForbiddenException({
          errorCode: 'ERR_MAX_ATTEMPTS_EXCEEDED',
          message: 'Bạn đã đạt số lượt thi tối đa cho phép trên đề thi này',
        });
      }
    }

    // 5. Kiểm tra chế độ làm bài Part Practice
    if (dto.mode === PartPracticeMode.PART_PRACTICE) {
      if (!exam.allowPartPractice) {
        throw new BadRequestException({
          errorCode: 'ERR_PART_PRACTICE_NOT_ALLOWED',
          message: 'Đề thi này không cho phép luyện tập theo Part',
        });
      }

      const availablePartNumbers = new Set(
        (exam.sections || [])
          .map((sec) => sec.part?.partNumber)
          .filter((p): p is number => p != null),
      );

      const invalidParts = (dto.selectedParts || []).filter(
        (partNum) => !availablePartNumbers.has(partNum),
      );

      if (invalidParts.length > 0) {
        throw new BadRequestException({
          errorCode: 'ERR_INVALID_SELECTED_PARTS',
          message: `Các Part sau không tồn tại trong đề thi: ${invalidParts.join(', ')}`,
        });
      }
    }

    // 6. Tính toán thời gian hết hạn expires_at
    const expiresAt = this.calculateExpiresAt(exam, dto.mode, dto.selectedParts, now);

    // 7. Tạo Snapshot đề thi
    const snapshotResult = await this.snapshotService.createSnapshot(exam, dto.selectedParts);

    // 8. Thực thi Transaction tạo ExamAttempt và ExamAttemptSnapshot
    try {
      const createdAttempt = await this.dataSource.transaction(async (manager) => {
        const attempt = this.examAttemptRepository.create({
          userId,
          examId: exam.id,
          status: ExamAttemptStatus.IN_PROGRESS,
          mode: dto.mode,
          selectedParts: dto.selectedParts ?? null,
          startedAt: now,
          expiresAt,
          totalQuestions: snapshotResult.totalQuestions,
          answeredCount: 0,
          deviceInfo: dto.deviceInfo ?? null,
          ipAddress: ipAddress ?? null,
          version: 1,
        });

        const savedAttempt = await manager.save(ExamAttempt, attempt);

        const snapshot = this.examAttemptSnapshotRepository.create({
          attemptId: savedAttempt.id,
          examMetadata: snapshotResult.examMetadata,
          shuffledQuestions: snapshotResult.shuffledQuestions,
          answerKeySnapshot: snapshotResult.answerKeySnapshot,
          isShuffledQuestions: snapshotResult.isShuffledQuestions,
          isShuffledOptions: snapshotResult.isShuffledOptions,
        });

        await manager.save(ExamAttemptSnapshot, snapshot);

        savedAttempt.exam = exam;
        return savedAttempt;
      });

      return this.mapToSummaryResponse(createdAttempt, false);
    } catch (error: unknown) {
      // PMR 021: Cứu vãn thông minh khi bắt lỗi PostgreSQL 23505 (Partial Unique Index) do race condition
      const dbError = error as { code?: string; message?: string; detail?: string } | null;
      if (
        dbError?.code === '23505' ||
        dbError?.message?.includes('uq_user_single_active_attempt') ||
        dbError?.detail?.includes('uq_user_single_active_attempt')
      ) {
        const concurrentAttempt = await this.examAttemptRepository.findOne({
          where: { userId, status: ExamAttemptStatus.IN_PROGRESS },
          relations: { exam: true },
        });

        if (concurrentAttempt) {
          if (concurrentAttempt.examId === exam.id) {
            return this.mapToSummaryResponse(concurrentAttempt, true);
          }

          throw new ConflictException({
            errorCode: 'ERR_ANOTHER_EXAM_IN_PROGRESS',
            message: 'Bạn đang có một bài thi dở dang ở đề thi khác',
            attemptId: concurrentAttempt.id,
            examTitle: concurrentAttempt.exam?.title ?? 'Đề thi khác',
            startedAt: concurrentAttempt.startedAt,
            remainingSeconds: Math.max(
              0,
              Math.floor((concurrentAttempt.expiresAt.getTime() - now.getTime()) / 1000),
            ),
          });
        }
      }

      throw error;
    }
  }

  async abandonAttempt(
    userId: string,
    attemptId: string,
    isAdmin: boolean = false,
  ): Promise<AbandonAttemptResponseDto> {
    const attempt = await this.examAttemptRepository.findOne({
      where: { id: attemptId },
    });

    if (!attempt) {
      throw new NotFoundException({
        errorCode: 'ERR_ATTEMPT_NOT_FOUND',
        message: 'Không tìm thấy lượt làm bài thi',
      });
    }

    if (attempt.userId !== userId && !isAdmin) {
      throw new ForbiddenException({
        errorCode: 'ERR_FORBIDDEN_ATTEMPT_ACCESS',
        message: 'Bạn không có quyền thao tác trên lượt làm bài này',
      });
    }

    if (attempt.status !== ExamAttemptStatus.IN_PROGRESS) {
      throw new BadRequestException({
        errorCode: 'ERR_ATTEMPT_NOT_IN_PROGRESS',
        message: 'Lượt làm bài không ở trạng thái đang làm dở',
      });
    }

    attempt.status = ExamAttemptStatus.ABANDONED;
    await this.examAttemptRepository.save(attempt);

    const response = new AbandonAttemptResponseDto();
    response.success = true;
    response.message = 'Đã hủy bài thi thành công';
    response.abandonedAt = new Date();
    return response;
  }

  private calculateExpiresAt(
    exam: Exam,
    mode: PartPracticeMode,
    selectedParts?: number[],
    now: Date = new Date(),
  ): Date {
    let allocatedSeconds = 0;

    if (mode === PartPracticeMode.FULL_EXAM) {
      allocatedSeconds = exam.durationMinutes * 60;
    } else {
      const selectedSet = new Set(selectedParts || []);
      const sections = (exam.sections || []).filter((s) =>
        s.part?.partNumber ? selectedSet.has(s.part.partNumber) : false,
      );

      for (const sec of sections) {
        if (sec.targetDurationMinutes && sec.targetDurationMinutes > 0) {
          allocatedSeconds += sec.targetDurationMinutes * 60;
        } else {
          const partNum = sec.part?.partNumber ?? 0;
          const qCount = sec.targetQuestionsCount || 0;
          if (partNum >= 1 && partNum <= 4) {
            // Listening: 45s/câu
            allocatedSeconds += qCount * 45;
          } else {
            // Reading: 36s/câu
            allocatedSeconds += qCount * 36;
          }
        }
      }

      // Làm tròn phút chẵn
      allocatedSeconds = Math.ceil(allocatedSeconds / 60) * 60;
    }

    const calculatedExpiresAt = new Date(now.getTime() + allocatedSeconds * 1000);

    // Nếu đề có closeAt và closeAt kết thúc trước thì rút ngắn theo closeAt
    if (exam.closeAt && exam.closeAt < calculatedExpiresAt) {
      return exam.closeAt;
    }

    return calculatedExpiresAt;
  }

  private mapToSummaryResponse(
    attempt: ExamAttempt,
    isResumed: boolean,
  ): ExamAttemptSummaryResponseDto {
    const now = new Date();
    const remainingSeconds = Math.max(
      0,
      Math.floor((attempt.expiresAt.getTime() - now.getTime()) / 1000),
    );

    const summary = new ExamAttemptSummaryResponseDto();
    summary.attemptId = attempt.id;
    summary.examId = attempt.examId;
    summary.examTitle = attempt.exam?.title ?? 'Đề thi';
    summary.status = attempt.status;
    summary.mode = attempt.mode;
    summary.selectedParts = attempt.selectedParts ?? null;
    summary.totalQuestions = attempt.totalQuestions;
    summary.startedAt = attempt.startedAt;
    summary.expiresAt = attempt.expiresAt;
    summary.remainingSeconds = remainingSeconds;
    summary.serverTimeNow = now;
    summary.isResumed = isResumed;

    return summary;
  }
}
