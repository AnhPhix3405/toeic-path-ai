import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { UserRole } from '../../../common/enums/user-role.enum';
import { SecurityEventType } from '../../../common/security-events/enums/security-event.enum';
import { SecurityEventService } from '../../../common/security-events/security-event.service';
import type { ApproveQuestionDto } from '../dto/request/approve-question.dto';
import type { BatchApproveQuestionsDto } from '../dto/request/batch-approve-questions.dto';
import type { QueryReviewQueueDto } from '../dto/request/query-review-queue.dto';
import type { QuickFixApproveDto } from '../dto/request/quick-fix-approve.dto';
import type { RejectQuestionDto } from '../dto/request/reject-question.dto';
import type { RequestRevisionDto } from '../dto/request/request-revision.dto';
import type { BatchReviewResponseDto, SkippedReviewItemDto } from '../dto/response/batch-review-response.dto';
import type { ReviewActionResponseDto } from '../dto/response/review-action-response.dto';
import { QuestionOption } from '../entities/question-option.entity';
import { QuestionReview } from '../entities/question-review.entity';
import { Question } from '../entities/question.entity';
import { QuestionHistoryChangeType } from '../enums/question-history-change-type.enum';
import { QuestionReviewAction } from '../enums/question-review-action.enum';
import { QuestionStatus } from '../enums/question-status.enum';
import { QuestionRepository } from '../repositories/question.repository';
import { QuestionHistoriesService } from './question-histories.service';

@Injectable()
export class QuestionReviewsService {
  constructor(
    private readonly questionRepo: QuestionRepository,
    @InjectRepository(QuestionReview)
    private readonly reviewRepo: Repository<QuestionReview>,
    private readonly historyService: QuestionHistoriesService,
    private readonly securityEventService: SecurityEventService,
    private readonly dataSource: DataSource,
  ) {}

  async getReviewQueue(
    dto: QueryReviewQueueDto,
  ): Promise<{ items: Question[]; total: number; page: number; limit: number }> {
    const { questions, total } = await this.questionRepo.findReviewQueue(dto);
    return {
      items: questions,
      total,
      page: dto.page,
      limit: dto.limit,
    };
  }

  async approveQuestion(
    questionId: string,
    dto: ApproveQuestionDto,
    reviewerId: string,
    role: UserRole,
  ): Promise<ReviewActionResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const question = await this.findQuestionForReview(questionId, manager);
      this.validateMakerChecker(question, reviewerId, role, dto.emergencyBypass);
      this.validateOptimisticLock(question, dto.version);

      if (dto.emergencyBypass && role === UserRole.ADMIN) {
        this.securityEventService.warn({
          event: SecurityEventType.ADMIN_REVIEW_BYPASS,
          result: 'success',
          module: 'admin',
          userId: reviewerId,
          metadata: { questionId, version: question.version },
        });
      }

      const newVersion = question.version + 1;
      question.status = QuestionStatus.PUBLISHED;
      question.version = newVersion;
      await manager.save(Question, question);

      const reviewLog = manager.create(QuestionReview, {
        questionId: question.id,
        reviewerId,
        action: QuestionReviewAction.APPROVED,
        feedback: dto.feedback ?? null,
        version: newVersion,
      });
      await manager.save(QuestionReview, reviewLog);

      return {
        id: question.id,
        status: question.status,
        version: newVersion,
        feedback: dto.feedback ?? null,
        updatedAt: new Date(),
      };
    });
  }

  async requestRevision(
    questionId: string,
    dto: RequestRevisionDto,
    reviewerId: string,
    role: UserRole,
  ): Promise<ReviewActionResponseDto> {
    if (!dto.feedback || dto.feedback.trim() === '') {
      throw new BadRequestException('Feedback is mandatory when requesting revision');
    }

    return this.dataSource.transaction(async (manager) => {
      const question = await this.findQuestionForReview(questionId, manager);
      this.validateMakerChecker(question, reviewerId, role);
      this.validateOptimisticLock(question, dto.version);

      const newVersion = question.version + 1;
      question.status = QuestionStatus.REVISION_REQUESTED;
      question.version = newVersion;
      await manager.save(Question, question);

      if (dto.applyToWholeGroup && question.questionGroupId) {
        await manager
          .createQueryBuilder()
          .update(Question)
          .set({ status: QuestionStatus.REVISION_REQUESTED, version: () => 'version + 1' })
          .where('questionGroupId = :groupId AND id != :id', {
            groupId: question.questionGroupId,
            id: question.id,
          })
          .execute();
      }

      const reviewLog = manager.create(QuestionReview, {
        questionId: question.id,
        reviewerId,
        action: QuestionReviewAction.REVISION_REQUESTED,
        feedback: dto.feedback,
        version: newVersion,
      });
      await manager.save(QuestionReview, reviewLog);

      return {
        id: question.id,
        status: question.status,
        version: newVersion,
        feedback: dto.feedback,
        updatedAt: new Date(),
      };
    });
  }

  async rejectQuestion(
    questionId: string,
    dto: RejectQuestionDto,
    reviewerId: string,
    role: UserRole,
  ): Promise<ReviewActionResponseDto> {
    if (!dto.feedback || dto.feedback.trim() === '') {
      throw new BadRequestException('Feedback is mandatory when rejecting a question');
    }

    return this.dataSource.transaction(async (manager) => {
      const question = await this.findQuestionForReview(questionId, manager);
      this.validateMakerChecker(question, reviewerId, role);
      this.validateOptimisticLock(question, dto.version);

      const newVersion = question.version + 1;
      question.status = QuestionStatus.REJECTED;
      question.version = newVersion;
      await manager.save(Question, question);

      if (dto.applyToWholeGroup && question.questionGroupId) {
        await manager
          .createQueryBuilder()
          .update(Question)
          .set({ status: QuestionStatus.REJECTED, version: () => 'version + 1' })
          .where('questionGroupId = :groupId AND id != :id', {
            groupId: question.questionGroupId,
            id: question.id,
          })
          .execute();
      }

      const reviewLog = manager.create(QuestionReview, {
        questionId: question.id,
        reviewerId,
        action: QuestionReviewAction.REJECTED,
        feedback: dto.feedback,
        version: newVersion,
      });
      await manager.save(QuestionReview, reviewLog);

      return {
        id: question.id,
        status: question.status,
        version: newVersion,
        feedback: dto.feedback,
        updatedAt: new Date(),
      };
    });
  }

  async quickFixApprove(
    questionId: string,
    dto: QuickFixApproveDto,
    reviewerId: string,
    role: UserRole,
  ): Promise<ReviewActionResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const question = await this.findQuestionForReview(questionId, manager);
      this.validateMakerChecker(question, reviewerId, role, dto.emergencyBypass);
      this.validateOptimisticLock(question, dto.version);

      const partNumber = question.part?.partNumber;

      // 1. Data Integrity Gate: Single Choice Invariant
      if (dto.options && dto.options.length > 0) {
        const correctCount = dto.options.filter((o) => o.isCorrect === true).length;
        if (correctCount !== 1) {
          throw new BadRequestException('Câu hỏi trắc nghiệm bắt buộc phải có duy nhất 1 đáp án đúng.');
        }

        // 2. Data Integrity Gate: Part Content Matrix (Tech Debt 006 Sync)
        const isOptionContentRequired = ![1, 2].includes(partNumber as number);
        if (isOptionContentRequired) {
          const hasEmptyOption = dto.options.some(
            (opt) => !opt.content || opt.content.trim() === '',
          );
          if (hasEmptyOption) {
            throw new BadRequestException(
              `Các lựa chọn đáp án của Part ${partNumber || 'chưa phân loại'} bắt buộc phải có nội dung văn bản.`,
            );
          }
        }
      }

      // Check question text content
      const isQuestionContentRequired = ![1, 2, 6].includes(partNumber as number);
      if (isQuestionContentRequired && dto.content !== undefined) {
        if (!dto.content || dto.content.trim() === '') {
          throw new BadRequestException(
            `Nội dung câu hỏi của Part ${partNumber || 'chưa phân loại'} bắt buộc phải có nội dung văn bản.`,
          );
        }
      }

      if (dto.emergencyBypass && role === UserRole.ADMIN) {
        this.securityEventService.warn({
          event: SecurityEventType.ADMIN_REVIEW_BYPASS,
          result: 'success',
          module: 'admin',
          userId: reviewerId,
          metadata: { questionId, version: question.version },
        });
      }

      // Snapshot before change
      const snapshotBefore = {
        content: question.content,
        explanation: question.explanation,
        options: question.options?.map((opt) => ({
          id: opt.id,
          content: opt.content,
          isCorrect: opt.isCorrect,
          position: opt.position,
          label: opt.label,
        })),
        version: question.version,
        status: question.status,
      };

      // Apply updates to question
      if (dto.content !== undefined) {
        question.content = dto.content;
      }
      if (dto.explanation !== undefined) {
        question.explanation = dto.explanation;
      }

      // Update options if provided
      if (dto.options && dto.options.length > 0) {
        for (const optDto of dto.options) {
          const optEntity = question.options?.find((o) => o.id === optDto.id);
          if (!optEntity) {
            throw new BadRequestException(`Option ${optDto.id} không thuộc về câu hỏi này.`);
          }
          optEntity.content = optDto.content ?? null;
          optEntity.isCorrect = optDto.isCorrect;
          await manager.save(QuestionOption, optEntity);
        }
      }

      const newVersion = question.version + 1;
      question.status = QuestionStatus.PUBLISHED;
      question.version = newVersion;
      await manager.save(Question, question);

      // Snapshot after change
      const snapshotAfter = {
        content: question.content,
        explanation: question.explanation,
        options: question.options?.map((opt) => ({
          id: opt.id,
          content: opt.content,
          isCorrect: opt.isCorrect,
          position: opt.position,
          label: opt.label,
        })),
        version: newVersion,
        status: QuestionStatus.PUBLISHED,
      };

      await this.historyService.createSnapshot(
        question.id,
        reviewerId,
        QuestionHistoryChangeType.QUICK_FIXED,
        snapshotBefore,
        snapshotAfter,
        dto.feedback ?? 'Quick-fix and approved',
        manager,
      );

      const reviewLog = manager.create(QuestionReview, {
        questionId: question.id,
        reviewerId,
        action: QuestionReviewAction.QUICK_FIX_APPROVED,
        feedback: dto.feedback ?? null,
        version: newVersion,
      });
      await manager.save(QuestionReview, reviewLog);

      return {
        id: question.id,
        status: question.status,
        version: newVersion,
        feedback: dto.feedback ?? null,
        updatedAt: new Date(),
      };
    });
  }

  async batchApprove(
    dto: BatchApproveQuestionsDto,
    reviewerId: string,
    role: UserRole,
  ): Promise<BatchReviewResponseDto> {
    let approvedCount = 0;
    const skipped: SkippedReviewItemDto[] = [];

    for (const item of dto.items) {
      try {
        await this.dataSource.transaction(async (manager) => {
          const question = await this.findQuestionForReview(item.questionId, manager);
          this.validateMakerChecker(question, reviewerId, role);
          this.validateOptimisticLock(question, item.version);

          const newVersion = question.version + 1;
          question.status = QuestionStatus.PUBLISHED;
          question.version = newVersion;
          await manager.save(Question, question);

          const reviewLog = manager.create(QuestionReview, {
            questionId: question.id,
            reviewerId,
            action: QuestionReviewAction.APPROVED,
            feedback: 'Batch approved',
            version: newVersion,
          });
          await manager.save(QuestionReview, reviewLog);
        });

        approvedCount++;
      } catch (error: any) {
        skipped.push({
          questionId: item.questionId,
          reason: error.message || 'Lỗi kiểm duyệt hoặc xung đột phiên bản',
        });
      }
    }

    return {
      approvedCount,
      skipped,
    };
  }

  async getReviewLogs(questionId: string): Promise<QuestionReview[]> {
    return this.reviewRepo.find({
      where: { questionId },
      order: { createdAt: 'DESC' },
      relations: { reviewer: true },
    });
  }

  private async findQuestionForReview(
    questionId: string,
    manager?: EntityManager,
  ): Promise<Question> {
    const repo = manager ? manager.getRepository(Question) : this.questionRepo;
    const question = await repo.findOne({
      where: { id: questionId },
      relations: { options: true, part: true, creator: true, questionGroup: true },
    });

    if (!question) {
      throw new NotFoundException(`Không tìm thấy câu hỏi với ID: ${questionId}`);
    }

    return question;
  }

  private validateMakerChecker(
    question: Question,
    reviewerId: string,
    role: UserRole,
    emergencyBypass?: boolean,
  ): void {
    if (question.createdBy === reviewerId) {
      if (role === UserRole.ADMIN && emergencyBypass) {
        return; // Admin bypass allowed
      }
      throw new ForbiddenException({
        message: 'Người tạo câu hỏi không được phép tự kiểm duyệt câu hỏi của chính mình (Maker-Checker Rule).',
        code: 'ERR_CANNOT_SELF_REVIEW',
      });
    }
  }

  private validateOptimisticLock(question: Question, clientVersion: number): void {
    if (question.version !== clientVersion) {
      throw new ConflictException({
        message: 'Nội dung câu hỏi đã bị thay đổi bởi người dùng khác. Vui lòng làm mới trang.',
        code: 'ERR_CONCURRENCY_CONFLICT',
      });
    }
  }
}
