import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { SecurityEventService } from '../../../common/security-events/security-event.service';
import { UserRole } from '../../../common/enums/user-role.enum';
import { QuestionHistory } from '../entities/question-history.entity';
import { QuestionOption } from '../entities/question-option.entity';
import { QuestionReview } from '../entities/question-review.entity';
import { Question } from '../entities/question.entity';
import { QuestionHistoryChangeType } from '../enums/question-history-change-type.enum';
import { QuestionReviewAction } from '../enums/question-review-action.enum';
import { QuestionStatus } from '../enums/question-status.enum';
import { QuestionRepository } from '../repositories/question.repository';
import { QuestionHistoriesService } from './question-histories.service';
import { QuestionReviewsService } from './question-reviews.service';

describe('QuestionReviewsService', () => {
  let service: QuestionReviewsService;
  let questionRepo: jest.Mocked<QuestionRepository>;
  let reviewRepo: jest.Mocked<Repository<QuestionReview>>;
  let historyService: jest.Mocked<QuestionHistoriesService>;
  let securityEventService: jest.Mocked<SecurityEventService>;
  let dataSource: jest.Mocked<DataSource>;

  const mockQuestion = (overrides?: Partial<Question>): Question =>
    ({
      id: 'q-1',
      content: 'Sample question content?',
      explanation: 'Explanation',
      status: QuestionStatus.PENDING_REVIEW,
      version: 1,
      createdBy: 'creator-uuid',
      partId: 'part-uuid',
      part: { partNumber: 5 } as any,
      options: [
        { id: 'opt-1', content: 'Option A', isCorrect: true, position: 1, label: 'A' },
        { id: 'opt-2', content: 'Option B', isCorrect: false, position: 2, label: 'B' },
        { id: 'opt-3', content: 'Option C', isCorrect: false, position: 3, label: 'C' },
        { id: 'opt-4', content: 'Option D', isCorrect: false, position: 4, label: 'D' },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as Question;

  beforeEach(async () => {
    const mockEntityManager = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation(async (_entityClass, entity) => entity || _entityClass),
      update: jest.fn(),
      create: jest.fn().mockImplementation((_entityClass, data) => data || _entityClass),
    };

    dataSource = {
      transaction: jest.fn().mockImplementation(async (cb: (manager: EntityManager) => Promise<any>) => {
        return cb(mockEntityManager as unknown as EntityManager);
      }),
    } as unknown as jest.Mocked<DataSource>;

    questionRepo = {
      findReviewQueue: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<QuestionRepository>;

    reviewRepo = {
      create: jest.fn().mockImplementation((data) => data),
      save: jest.fn().mockImplementation(async (data) => data),
      find: jest.fn(),
    } as unknown as jest.Mocked<Repository<QuestionReview>>;

    historyService = {
      createSnapshot: jest.fn().mockResolvedValue({} as QuestionHistory),
      getHistoriesByQuestionId: jest.fn(),
    } as unknown as jest.Mocked<QuestionHistoriesService>;

    securityEventService = {
      warn: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<SecurityEventService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuestionReviewsService,
        { provide: QuestionRepository, useValue: questionRepo },
        { provide: getRepositoryToken(QuestionReview), useValue: reviewRepo },
        { provide: QuestionHistoriesService, useValue: historyService },
        { provide: SecurityEventService, useValue: securityEventService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<QuestionReviewsService>(QuestionReviewsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Review Focus 1: Maker-Checker Enforcement', () => {
    it('should throw ForbiddenException ERR_CANNOT_SELF_REVIEW when reviewer is creator', async () => {
      const q = mockQuestion({ createdBy: 'teacher-creator' });
      jest.spyOn(service as any, 'findQuestionForReview').mockResolvedValue(q);

      await expect(
        service.approveQuestion('q-1', { version: 1 }, 'teacher-creator', UserRole.TEACHER),
      ).rejects.toThrow(
        new ForbiddenException({
          message: 'Người tạo câu hỏi không được phép tự kiểm duyệt câu hỏi của chính mình (Maker-Checker Rule).',
          code: 'ERR_CANNOT_SELF_REVIEW',
        }),
      );
    });
  });

  describe('Review Focus 2: Admin Emergency Bypass', () => {
    it('should allow Admin self-approval when emergencyBypass is true and log security audit event', async () => {
      const q = mockQuestion({ createdBy: 'admin-id' });
      jest.spyOn(service as any, 'findQuestionForReview').mockResolvedValue(q);

      const result = await service.approveQuestion(
        'q-1',
        { version: 1, emergencyBypass: true, feedback: 'Emergency production fix' },
        'admin-id',
        UserRole.ADMIN,
      );

      expect(result.status).toBe(QuestionStatus.PUBLISHED);
      expect(securityEventService.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'ADMIN_REVIEW_BYPASS',
          userId: 'admin-id',
        }),
      );
    });
  });

  describe('Review Focus 3: Optimistic Locking Conflict', () => {
    it('should throw ConflictException ERR_CONCURRENCY_CONFLICT when version mismatches', async () => {
      const q = mockQuestion({ version: 2 });
      jest.spyOn(service as any, 'findQuestionForReview').mockResolvedValue(q);

      await expect(
        service.approveQuestion('q-1', { version: 1 }, 'reviewer-id', UserRole.TEACHER),
      ).rejects.toThrow(
        new ConflictException({
          message: 'Nội dung câu hỏi đã bị thay đổi bởi người dùng khác. Vui lòng làm mới trang.',
          code: 'ERR_CONCURRENCY_CONFLICT',
        }),
      );
    });
  });

  describe('Review Focus 4: Data Integrity & Tech Debt 006 Sync Gate', () => {
    it('should allow null option content for Part 1 and Part 2 during quick-fix', async () => {
      const q = mockQuestion({
        part: { partNumber: 1 } as any,
        options: [
          { id: 'opt-1', content: null, isCorrect: true, position: 1, label: 'A' },
          { id: 'opt-2', content: null, isCorrect: false, position: 2, label: 'B' },
          { id: 'opt-3', content: null, isCorrect: false, position: 3, label: 'C' },
          { id: 'opt-4', content: null, isCorrect: false, position: 4, label: 'D' },
        ] as any,
      });
      jest.spyOn(service as any, 'findQuestionForReview').mockResolvedValue(q);

      const result = await service.quickFixApprove(
        'q-1',
        {
          version: 1,
          content: null,
          options: [
            { id: 'opt-1', content: null, isCorrect: true },
            { id: 'opt-2', content: null, isCorrect: false },
            { id: 'opt-3', content: null, isCorrect: false },
            { id: 'opt-4', content: null, isCorrect: false },
          ],
        },
        'reviewer-id',
        UserRole.TEACHER,
      );

      expect(result.status).toBe(QuestionStatus.PUBLISHED);
      expect(historyService.createSnapshot).toHaveBeenCalledWith(
        'q-1',
        'reviewer-id',
        QuestionHistoryChangeType.QUICK_FIXED,
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );
    });

    it('should reject empty option content for Part 5 with BadRequestException', async () => {
      const q = mockQuestion({ part: { partNumber: 5 } as any });
      jest.spyOn(service as any, 'findQuestionForReview').mockResolvedValue(q);

      await expect(
        service.quickFixApprove(
          'q-1',
          {
            version: 1,
            options: [
              { id: 'opt-1', content: '', isCorrect: true },
              { id: 'opt-2', content: 'Valid B', isCorrect: false },
              { id: 'opt-3', content: 'Valid C', isCorrect: false },
              { id: 'opt-4', content: 'Valid D', isCorrect: false },
            ],
          },
          'reviewer-id',
          UserRole.TEACHER,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should enforce single choice invariant (exactly one correct option)', async () => {
      const q = mockQuestion({ part: { partNumber: 5 } as any });
      jest.spyOn(service as any, 'findQuestionForReview').mockResolvedValue(q);

      await expect(
        service.quickFixApprove(
          'q-1',
          {
            version: 1,
            options: [
              { id: 'opt-1', content: 'A', isCorrect: true },
              { id: 'opt-2', content: 'B', isCorrect: true },
              { id: 'opt-3', content: 'C', isCorrect: false },
              { id: 'opt-4', content: 'D', isCorrect: false },
            ],
          },
          'reviewer-id',
          UserRole.TEACHER,
        ),
      ).rejects.toThrow(new BadRequestException('Câu hỏi trắc nghiệm bắt buộc phải có duy nhất 1 đáp án đúng.'));
    });
  });

  describe('Review Focus 5: Batch Review Resilience', () => {
    it('should process batch approve with isolated transactions per item and return skipped items', async () => {
      const qValid = mockQuestion({ id: 'q-valid', createdBy: 'other-teacher', version: 1 });
      const qSelf = mockQuestion({ id: 'q-self', createdBy: 'reviewer-id', version: 1 });
      const qConflict = mockQuestion({ id: 'q-conflict', createdBy: 'other-teacher', version: 2 });

      jest.spyOn(service as any, 'findQuestionForReview').mockImplementation(async (id: string) => {
        if (id === 'q-valid') return qValid;
        if (id === 'q-self') return qSelf;
        if (id === 'q-conflict') return qConflict;
        throw new NotFoundException('Question not found');
      });

      const result = await service.batchApprove(
        {
          items: [
            { questionId: 'q-valid', version: 1 },
            { questionId: 'q-self', version: 1 },
            { questionId: 'q-conflict', version: 1 },
          ],
        },
        'reviewer-id',
        UserRole.TEACHER,
      );

      expect(result.approvedCount).toBe(1);
      expect(result.skipped.length).toBe(2);
      expect(result.skipped.some((s) => s.questionId === 'q-self')).toBe(true);
      expect(result.skipped.some((s) => s.questionId === 'q-conflict')).toBe(true);
    });
  });
});
