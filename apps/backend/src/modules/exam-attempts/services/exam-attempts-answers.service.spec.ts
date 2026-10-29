import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ExamAttemptsAnswersService } from './exam-attempts-answers.service';
import { ExamAttempt } from '../entities/exam-attempt.entity';
import { ExamAttemptSnapshot } from '../entities/exam-attempt-snapshot.entity';
import { ExamAttemptAnswer } from '../entities/exam-attempt-answer.entity';
import { ExamAttemptStatus } from '../enums/exam-attempt-status.enum';

describe('ExamAttemptsAnswersService (UC22)', () => {
  let service: ExamAttemptsAnswersService;
  let dataSourceMock: { query: jest.Mock };
  let attemptRepoMock: { findOne: jest.Mock };
  let snapshotRepoMock: { findOne: jest.Mock };
  let answerRepoMock: { find: jest.Mock };

  const attemptId = '50000000-0000-4000-8000-000000000001';
  const userId = '10000000-0000-4000-8000-000000000001';
  const otherUserId = '10000000-0000-4000-8000-000000000099';

  const mockAttempt: Partial<ExamAttempt> = {
    id: attemptId,
    userId,
    status: ExamAttemptStatus.IN_PROGRESS,
    startedAt: new Date(Date.now() - 600000), // 10 mins ago
    expiresAt: new Date(Date.now() + 3600000), // 60 mins from now
    answeredCount: 5,
  };

  const mockSnapshot = {
    id: 'snap-1',
    attemptId,
    shuffledQuestions: [
      {
        id: '20000000-0000-4000-8000-000000000001',
        partNumber: 1,
        options: [
          { id: '30000000-0000-4000-8000-000000000001', label: 'A' },
          { id: '30000000-0000-4000-8000-000000000002', label: 'B' },
        ],
      },
      {
        id: '20000000-0000-4000-8000-000000000002',
        partNumber: 2,
        options: [
          { id: '30000000-0000-4000-8000-000000000003', label: 'A' },
          { id: '30000000-0000-4000-8000-000000000004', label: 'B' },
        ],
      },
    ],
  };

  beforeEach(async () => {
    dataSourceMock = {
      query: jest.fn(),
    };
    attemptRepoMock = {
      findOne: jest.fn(),
    };
    snapshotRepoMock = {
      findOne: jest.fn(),
    };
    answerRepoMock = {
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExamAttemptsAnswersService,
        {
          provide: DataSource,
          useValue: dataSourceMock,
        },
        {
          provide: getRepositoryToken(ExamAttempt),
          useValue: attemptRepoMock,
        },
        {
          provide: getRepositoryToken(ExamAttemptSnapshot),
          useValue: snapshotRepoMock,
        },
        {
          provide: getRepositoryToken(ExamAttemptAnswer),
          useValue: answerRepoMock,
        },
      ],
    }).compile();

    service = module.get<ExamAttemptsAnswersService>(ExamAttemptsAnswersService);
  });

  describe('saveAnswer', () => {
    it('should save answer successfully with new option UUID and return RETURNING answered_count', async () => {
      attemptRepoMock.findOne.mockResolvedValue({ ...mockAttempt });
      snapshotRepoMock.findOne.mockResolvedValue(mockSnapshot);

      dataSourceMock.query.mockImplementation((sql: string) => {
        if (sql.includes('UPDATE exam_attempts')) {
          return Promise.resolve([{ answered_count: 6 }]);
        }
        return Promise.resolve([]);
      });

      const result = await service.saveAnswer(userId, attemptId, {
        questionId: '20000000-0000-4000-8000-000000000001',
        selectedOptionId: '30000000-0000-4000-8000-000000000001',
        isMarkedForReview: true,
        timeSpentSeconds: 15,
      });

      expect(result.success).toBe(true);
      expect(result.questionId).toBe('20000000-0000-4000-8000-000000000001');
      expect(result.selectedOptionId).toBe('30000000-0000-4000-8000-000000000001');
      expect(result.isMarkedForReview).toBe(true);
      expect(result.answeredCount).toBe(6);

      // Verify parameters passed to raw SQL query
      const insertCall = dataSourceMock.query.mock.calls[0];
      expect(insertCall[1][0]).toBe(attemptId);
      expect(insertCall[1][1]).toBe('20000000-0000-4000-8000-000000000001');
      expect(insertCall[1][2]).toBe('30000000-0000-4000-8000-000000000001');
      expect(insertCall[1][3]).toBe(true);
      expect(insertCall[1][4]).toBe(15);
      expect(insertCall[1][5]).toBe(true); // isOptionProvided
      expect(insertCall[1][6]).toBe(true); // isReviewProvided
    });

    it('should pass isOptionProvided: false when selectedOptionId is undefined (toggle review only)', async () => {
      attemptRepoMock.findOne.mockResolvedValue({ ...mockAttempt });
      snapshotRepoMock.findOne.mockResolvedValue(mockSnapshot);

      dataSourceMock.query.mockImplementation((sql: string) => {
        if (sql.includes('UPDATE exam_attempts')) {
          return Promise.resolve([{ answered_count: 5 }]);
        }
        return Promise.resolve([]);
      });

      const result = await service.saveAnswer(userId, attemptId, {
        questionId: '20000000-0000-4000-8000-000000000001',
        isMarkedForReview: true,
      });

      expect(result.success).toBe(true);
      expect(result.selectedOptionId).toBeNull();
      const insertCall = dataSourceMock.query.mock.calls[0];
      expect(insertCall[1][2]).toBeNull(); // converted undefined to null
      expect(insertCall[1][5]).toBe(false); // isOptionProvided = false
      expect(insertCall[1][6]).toBe(true); // isReviewProvided = true
    });

    it('should pass isOptionProvided: true and selectedOptionId: null on explicit uncheck', async () => {
      attemptRepoMock.findOne.mockResolvedValue({ ...mockAttempt });
      snapshotRepoMock.findOne.mockResolvedValue(mockSnapshot);

      dataSourceMock.query.mockImplementation((sql: string) => {
        if (sql.includes('UPDATE exam_attempts')) {
          return Promise.resolve([{ answered_count: 4 }]);
        }
        return Promise.resolve([]);
      });

      const result = await service.saveAnswer(userId, attemptId, {
        questionId: '20000000-0000-4000-8000-000000000001',
        selectedOptionId: null,
      });

      expect(result.success).toBe(true);
      const insertCall = dataSourceMock.query.mock.calls[0];
      expect(insertCall[1][2]).toBeNull();
      expect(insertCall[1][5]).toBe(true); // isOptionProvided = true
      expect(insertCall[1][6]).toBe(false); // isReviewProvided = false
    });

    it('should throw ForbiddenException when user is not the attempt owner (PMR 023)', async () => {
      attemptRepoMock.findOne.mockResolvedValue({ ...mockAttempt });

      await expect(
        service.saveAnswer(otherUserId, attemptId, {
          questionId: '20000000-0000-4000-8000-000000000001',
          selectedOptionId: '30000000-0000-4000-8000-000000000001',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when attempt does not exist', async () => {
      attemptRepoMock.findOne.mockResolvedValue(null);

      await expect(
        service.saveAnswer(userId, attemptId, {
          questionId: '20000000-0000-4000-8000-000000000001',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when attempt is not in_progress', async () => {
      attemptRepoMock.findOne.mockResolvedValue({
        ...mockAttempt,
        status: ExamAttemptStatus.SUBMITTED,
      });

      await expect(
        service.saveAnswer(userId, attemptId, {
          questionId: '20000000-0000-4000-8000-000000000001',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when expired past 30s grace period', async () => {
      attemptRepoMock.findOne.mockResolvedValue({
        ...mockAttempt,
        expiresAt: new Date(Date.now() - 35000), // 35 seconds ago
      });

      await expect(
        service.saveAnswer(userId, attemptId, {
          questionId: '20000000-0000-4000-8000-000000000001',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException ERR_QUESTION_NOT_IN_ATTEMPT when questionId not in snapshot', async () => {
      attemptRepoMock.findOne.mockResolvedValue({ ...mockAttempt });
      snapshotRepoMock.findOne.mockResolvedValue(mockSnapshot);

      await expect(
        service.saveAnswer(userId, attemptId, {
          questionId: '20000000-0000-4000-8000-000000000099',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException ERR_INVALID_OPTION_CHOICE when selectedOptionId does not belong to question', async () => {
      attemptRepoMock.findOne.mockResolvedValue({ ...mockAttempt });
      snapshotRepoMock.findOne.mockResolvedValue(mockSnapshot);

      await expect(
        service.saveAnswer(userId, attemptId, {
          questionId: '20000000-0000-4000-8000-000000000001',
          selectedOptionId: '30000000-0000-4000-8000-000000000099', // Not in option set
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('batchSaveAnswers', () => {
    it('should successfully bulk upsert valid answers and separate invalid items (PMR 019 & PMR 023)', async () => {
      attemptRepoMock.findOne.mockResolvedValue({ ...mockAttempt });
      snapshotRepoMock.findOne.mockResolvedValue(mockSnapshot);

      dataSourceMock.query.mockImplementation((sql: string) => {
        if (sql.includes('SELECT answered_count')) {
          return Promise.resolve([{ answered_count: 7 }]);
        }
        return Promise.resolve([]);
      });

      const result = await service.batchSaveAnswers(userId, attemptId, {
        answers: [
          {
            questionId: '20000000-0000-4000-8000-000000000001',
            selectedOptionId: '30000000-0000-4000-8000-000000000001',
            isMarkedForReview: true,
            clientAnsweredAt: new Date(Date.now() - 100000).toISOString(),
          },
          {
            questionId: '20000000-0000-4000-8000-000000000002',
            isMarkedForReview: false, // review only
          },
          {
            questionId: '20000000-0000-4000-8000-000000000099', // Invalid question
            selectedOptionId: '30000000-0000-4000-8000-000000000001',
          },
          {
            questionId: '20000000-0000-4000-8000-000000000001',
            selectedOptionId: '30000000-0000-4000-8000-000000000099', // Invalid option
          },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.syncedCount).toBe(2);
      expect(result.failedCount).toBe(2);
      expect(result.failedItems).toEqual([
        {
          questionId: '20000000-0000-4000-8000-000000000099',
          reason: 'ERR_QUESTION_NOT_IN_ATTEMPT',
        },
        {
          questionId: '20000000-0000-4000-8000-000000000001',
          reason: 'ERR_INVALID_OPTION_CHOICE',
        },
      ]);
      expect(result.answeredCount).toBe(7);
      expect(dataSourceMock.query).toHaveBeenCalled();
    });

    it('should not execute SQL insert when all items are invalid', async () => {
      attemptRepoMock.findOne.mockResolvedValue({ ...mockAttempt });
      snapshotRepoMock.findOne.mockResolvedValue(mockSnapshot);

      dataSourceMock.query.mockImplementation((sql: string) => {
        if (sql.includes('SELECT answered_count')) {
          return Promise.resolve([{ answered_count: 5 }]);
        }
        return Promise.resolve([]);
      });

      const result = await service.batchSaveAnswers(userId, attemptId, {
        answers: [
          {
            questionId: '20000000-0000-4000-8000-000000000099',
          },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.syncedCount).toBe(0);
      expect(result.failedCount).toBe(1);
      // No INSERT queries executed
      expect(
        dataSourceMock.query.mock.calls.some((c) => (c[0] as string).includes('INSERT INTO')),
      ).toBe(false);
    });
  });
});
