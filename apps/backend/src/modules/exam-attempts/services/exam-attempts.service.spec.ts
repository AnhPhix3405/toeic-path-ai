import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ExamAttemptsService } from './exam-attempts.service';
import { SnapshotService } from './snapshot.service';
import { ExamAttempt } from '../entities/exam-attempt.entity';
import { ExamAttemptSnapshot } from '../entities/exam-attempt-snapshot.entity';
import { Exam } from '../../exams/entities/exam.entity';
import { ExamStatus } from '../../exams/enums/exam-status.enum';
import { ExamType } from '../../exams/enums/exam-type.enum';
import { PartPracticeMode } from '../enums/part-practice-mode.enum';
import { ExamAttemptStatus } from '../enums/exam-attempt-status.enum';

describe('ExamAttemptsService', () => {
  let service: ExamAttemptsService;
  let examRepoMock: any;
  let attemptRepoMock: any;
  let snapshotRepoMock: any;
  let snapshotServiceMock: any;
  let dataSourceMock: any;

  const mockExam: Exam = {
    id: '30000000-0000-4000-8000-000000000001',
    title: 'ETS TOEIC Test 01',
    description: 'Test description',
    type: ExamType.FULL_TEST,
    durationMinutes: 120,
    maxAttempts: 2,
    passingScore: 600,
    openAt: null,
    closeAt: null,
    allowPartPractice: true,
    isShuffledQuestions: false,
    isShuffledOptions: false,
    scoreConversionType: 'DEFAULT_ETS' as any,
    status: ExamStatus.PUBLISHED,
    publishedAt: new Date(),
    version: 1,
    isDeleted: false,
    deletedAt: null,
    createdBy: 'user-1',
    creator: null as any,
    sections: [
      {
        id: 'sec-1',
        examId: '30000000-0000-4000-8000-000000000001',
        partId: 'part-1-id',
        part: { partNumber: 1 } as any,
        targetQuestionsCount: 6,
        targetDurationMinutes: null,
        exam: null as any,
        questions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'sec-5',
        examId: '30000000-0000-4000-8000-000000000001',
        partId: 'part-5-id',
        part: { partNumber: 5 } as any,
        targetQuestionsCount: 30,
        targetDurationMinutes: 12,
        exam: null as any,
        questions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    questions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    examRepoMock = {
      findOne: jest.fn(),
    };

    attemptRepoMock = {
      findOne: jest.fn(),
      count: jest.fn(),
      create: jest.fn().mockImplementation((dto) => ({ ...dto })),
      save: jest.fn(),
    };

    snapshotRepoMock = {
      create: jest.fn().mockImplementation((dto) => ({ ...dto })),
      save: jest.fn(),
    };

    snapshotServiceMock = {
      createSnapshot: jest.fn().mockResolvedValue({
        examMetadata: { title: 'ETS TOEIC Test 01' },
        shuffledQuestions: [{ id: 'q1', orderIndex: 1 }],
        answerKeySnapshot: { q1: 'opt1' },
        isShuffledQuestions: false,
        isShuffledOptions: false,
        totalQuestions: 1,
      }),
    };

    dataSourceMock = {
      transaction: jest.fn().mockImplementation(async (cb) => {
        const manager = {
          save: jest.fn().mockImplementation((targetOrEntity, maybeEntity) => {
            const entity = maybeEntity !== undefined ? maybeEntity : targetOrEntity;
            if (!entity.id) entity.id = 'attempt-uuid-1';
            return Promise.resolve(entity);
          }),
        };
        return cb(manager);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExamAttemptsService,
        SnapshotService,
        { provide: getRepositoryToken(Exam), useValue: examRepoMock },
        { provide: getRepositoryToken(ExamAttempt), useValue: attemptRepoMock },
        { provide: getRepositoryToken(ExamAttemptSnapshot), useValue: snapshotRepoMock },
        { provide: SnapshotService, useValue: snapshotServiceMock },
        { provide: DataSource, useValue: dataSourceMock },
      ],
    }).compile();

    service = module.get<ExamAttemptsService>(ExamAttemptsService);
  });

  describe('startAttempt', () => {
    it('should throw NotFoundException if exam does not exist or not published', async () => {
      examRepoMock.findOne.mockResolvedValue(null);

      await expect(
        service.startAttempt('user-1', {
          examId: '30000000-0000-4000-8000-000000000001',
          mode: PartPracticeMode.FULL_EXAM,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if exam openAt is in the future or closeAt is in the past', async () => {
      const futureExam = { ...mockExam, openAt: new Date(Date.now() + 100000) };
      examRepoMock.findOne.mockResolvedValue(futureExam);

      await expect(
        service.startAttempt('user-1', {
          examId: '30000000-0000-4000-8000-000000000001',
          mode: PartPracticeMode.FULL_EXAM,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return 200 resume DTO if active attempt on same exam exists', async () => {
      examRepoMock.findOne.mockResolvedValue(mockExam);
      attemptRepoMock.findOne.mockResolvedValue({
        id: 'attempt-1',
        userId: 'user-1',
        examId: mockExam.id,
        exam: mockExam,
        status: ExamAttemptStatus.IN_PROGRESS,
        mode: PartPracticeMode.FULL_EXAM,
        selectedParts: null,
        totalQuestions: 200,
        startedAt: new Date(),
        expiresAt: new Date(Date.now() + 3600 * 1000),
      });

      const result = await service.startAttempt('user-1', {
        examId: mockExam.id,
        mode: PartPracticeMode.FULL_EXAM,
      });

      expect(result.isResumed).toBe(true);
      expect(result.attemptId).toBe('attempt-1');
    });

    it('should throw ConflictException (409) if active attempt on another exam exists', async () => {
      examRepoMock.findOne.mockResolvedValue(mockExam);
      attemptRepoMock.findOne.mockResolvedValue({
        id: 'attempt-2',
        userId: 'user-1',
        examId: 'other-exam-id',
        exam: { title: 'Other Exam' },
        status: ExamAttemptStatus.IN_PROGRESS,
        startedAt: new Date(),
        expiresAt: new Date(Date.now() + 3600 * 1000),
      });

      await expect(
        service.startAttempt('user-1', {
          examId: mockExam.id,
          mode: PartPracticeMode.FULL_EXAM,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should handle race condition 23505 intelligently by recovering active attempt (PMR 021)', async () => {
      examRepoMock.findOne.mockResolvedValue(mockExam);
      attemptRepoMock.findOne
        .mockResolvedValueOnce(null) // Step 4 check: no attempt found in-memory
        .mockResolvedValueOnce({
          // Catch block recovery query
          id: 'attempt-recovered',
          userId: 'user-1',
          examId: mockExam.id,
          exam: mockExam,
          status: ExamAttemptStatus.IN_PROGRESS,
          mode: PartPracticeMode.FULL_EXAM,
          totalQuestions: 200,
          startedAt: new Date(),
          expiresAt: new Date(Date.now() + 3600 * 1000),
        });

      attemptRepoMock.count.mockResolvedValue(0);

      // Simulate 23505 unique constraint violation on transaction execution
      const err: any = new Error('duplicate key value violates unique constraint');
      err.code = '23505';
      dataSourceMock.transaction.mockRejectedValueOnce(err);

      const result = await service.startAttempt('user-1', {
        examId: mockExam.id,
        mode: PartPracticeMode.FULL_EXAM,
      });

      expect(result.isResumed).toBe(true);
      expect(result.attemptId).toBe('attempt-recovered');
    });

    it('should throw ForbiddenException if max_attempts exceeded for full_exam (including abandoned)', async () => {
      examRepoMock.findOne.mockResolvedValue(mockExam);
      attemptRepoMock.findOne.mockResolvedValue(null);
      attemptRepoMock.count.mockResolvedValue(2); // maxAttempts is 2

      await expect(
        service.startAttempt('user-1', {
          examId: mockExam.id,
          mode: PartPracticeMode.FULL_EXAM,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should bypass max_attempts check when mode is part_practice', async () => {
      examRepoMock.findOne.mockResolvedValue(mockExam);
      attemptRepoMock.findOne.mockResolvedValue(null);
      attemptRepoMock.count.mockResolvedValue(10); // exceed 2, but part_practice should ignore

      const result = await service.startAttempt('user-1', {
        examId: mockExam.id,
        mode: PartPracticeMode.PART_PRACTICE,
        selectedParts: [5],
      });

      expect(result.isResumed).toBe(false);
      expect(result.mode).toBe(PartPracticeMode.PART_PRACTICE);
    });

    it('should throw BadRequestException if part_practice is not allowed on exam', async () => {
      const noPartExam = { ...mockExam, allowPartPractice: false };
      examRepoMock.findOne.mockResolvedValue(noPartExam);
      attemptRepoMock.findOne.mockResolvedValue(null);

      await expect(
        service.startAttempt('user-1', {
          examId: mockExam.id,
          mode: PartPracticeMode.PART_PRACTICE,
          selectedParts: [5],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should calculate expiresAt deterministically with ceiling minutes', async () => {
      examRepoMock.findOne.mockResolvedValue(mockExam);
      attemptRepoMock.findOne.mockResolvedValue(null);

      // Part 1: 6 questions, no target duration => 6 * 45s = 270s => Math.ceil(270/60)*60 = 300s (5 mins)
      const result = await service.startAttempt('user-1', {
        examId: mockExam.id,
        mode: PartPracticeMode.PART_PRACTICE,
        selectedParts: [1],
      });

      expect(result.remainingSeconds).toBeGreaterThanOrEqual(299);
      expect(result.remainingSeconds).toBeLessThanOrEqual(300);
    });
  });

  describe('abandonAttempt', () => {
    it('should throw NotFoundException if attempt does not exist', async () => {
      attemptRepoMock.findOne.mockResolvedValue(null);

      await expect(service.abandonAttempt('user-1', 'att-1', false)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if user is not owner and not admin', async () => {
      attemptRepoMock.findOne.mockResolvedValue({
        id: 'att-1',
        userId: 'other-user',
        status: ExamAttemptStatus.IN_PROGRESS,
      });

      await expect(service.abandonAttempt('user-1', 'att-1', false)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException if attempt is not in_progress', async () => {
      attemptRepoMock.findOne.mockResolvedValue({
        id: 'att-1',
        userId: 'user-1',
        status: ExamAttemptStatus.SUBMITTED,
      });

      await expect(service.abandonAttempt('user-1', 'att-1', false)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should abandon attempt and return success', async () => {
      const attempt = {
        id: 'att-1',
        userId: 'user-1',
        status: ExamAttemptStatus.IN_PROGRESS,
      };
      attemptRepoMock.findOne.mockResolvedValue(attempt);
      attemptRepoMock.save.mockResolvedValue({ ...attempt, status: ExamAttemptStatus.ABANDONED });

      const result = await service.abandonAttempt('user-1', 'att-1', false);
      expect(result.success).toBe(true);
      expect(result.message).toContain('thành công');
    });
  });
});
