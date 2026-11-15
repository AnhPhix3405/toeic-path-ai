import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ExamAttempt } from '../entities/exam-attempt.entity';
import { ExamAttemptStatus } from '../enums/exam-attempt-status.enum';
import { ExamAttemptsSubmissionService } from './exam-attempts-submission.service';

describe('ExamAttemptsSubmissionService (UC23 & UC24)', () => {
  let service: ExamAttemptsSubmissionService;
  let attemptRepoMock: {
    findOne: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let gradingServiceMock: {
    gradeAttemptInTransaction: jest.Mock;
  };
  let dataSourceMock: {
    transaction: jest.Mock;
  };

  beforeEach(() => {
    attemptRepoMock = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    gradingServiceMock = {
      gradeAttemptInTransaction: jest.fn(async (_manager, attempt: ExamAttempt) => {
        attempt.totalScore = 750;
        attempt.listeningScore = 400;
        attempt.readingScore = 350;
        attempt.correctCount = 150;
        attempt.wrongCount = 40;
        attempt.skippedCount = 10;
        attempt.totalQuestions = 200;
        attempt.accuracyPercentage = 75;
        attempt.isPassed = true;
        return attempt;
      }),
    };

    dataSourceMock = {
      transaction: jest.fn(),
    };

    service = new ExamAttemptsSubmissionService(
      attemptRepoMock as unknown as Repository<ExamAttempt>,
      gradingServiceMock,
      dataSourceMock as unknown as DataSource,
    );
  });

  describe('submitAttempt (UC23)', () => {
    it('should throw NotFoundException (ERR_ATTEMPT_NOT_FOUND) when attempt does not exist', async () => {
      attemptRepoMock.findOne.mockResolvedValue(null);

      await expect(service.submitAttempt('user-1', 'att-missing')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.submitAttempt('user-1', 'att-missing')).rejects.toMatchObject({
        response: expect.objectContaining({
          errorCode: 'ERR_ATTEMPT_NOT_FOUND',
        }),
      });
    });

    it('should throw ForbiddenException (ERR_FORBIDDEN_ATTEMPT_ACCESS) when attempt belongs to another user', async () => {
      const attempt = new ExamAttempt();
      attempt.id = 'att-1';
      attempt.userId = 'owner-user';
      attempt.status = ExamAttemptStatus.IN_PROGRESS;
      attemptRepoMock.findOne.mockResolvedValue(attempt);

      await expect(service.submitAttempt('other-user', 'att-1')).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.submitAttempt('other-user', 'att-1')).rejects.toMatchObject({
        response: expect.objectContaining({
          errorCode: 'ERR_FORBIDDEN_ATTEMPT_ACCESS',
        }),
      });
    });

    it('should throw ConflictException (ERR_ATTEMPT_ALREADY_SUBMITTED) with status and submittedAt when attempt is already submitted or timed_out', async () => {
      const submittedAt = new Date('2026-11-15T08:30:00.000Z');
      const attempt = new ExamAttempt();
      attempt.id = 'att-1';
      attempt.userId = 'user-1';
      attempt.status = ExamAttemptStatus.SUBMITTED;
      attempt.submittedAt = submittedAt;
      attemptRepoMock.findOne.mockResolvedValue(attempt);

      await expect(service.submitAttempt('user-1', 'att-1')).rejects.toThrow(ConflictException);
      await expect(service.submitAttempt('user-1', 'att-1')).rejects.toMatchObject({
        response: {
          errorCode: 'ERR_ATTEMPT_ALREADY_SUBMITTED',
          message: expect.any(String),
          status: ExamAttemptStatus.SUBMITTED,
          submittedAt,
        },
      });
    });

    it('should throw BadRequestException (ERR_ATTEMPT_NOT_IN_PROGRESS) when attempt is abandoned', async () => {
      const attempt = new ExamAttempt();
      attempt.id = 'att-1';
      attempt.userId = 'user-1';
      attempt.status = ExamAttemptStatus.ABANDONED;
      attemptRepoMock.findOne.mockResolvedValue(attempt);

      await expect(service.submitAttempt('user-1', 'att-1')).rejects.toThrow(BadRequestException);
      await expect(service.submitAttempt('user-1', 'att-1')).rejects.toMatchObject({
        response: expect.objectContaining({
          errorCode: 'ERR_ATTEMPT_NOT_IN_PROGRESS',
        }),
      });
    });

    it('should throw ConflictException inside transaction if concurrent request or Cronjob already transitioned status after pessimistic_write lock (E1/E2 - PMR 026 & PMR 029)', async () => {
      const initialAttempt = new ExamAttempt();
      initialAttempt.id = 'att-race';
      initialAttempt.userId = 'user-1';
      initialAttempt.status = ExamAttemptStatus.IN_PROGRESS;
      attemptRepoMock.findOne.mockResolvedValue(initialAttempt);

      const lockedAttempt = new ExamAttempt();
      lockedAttempt.id = 'att-race';
      lockedAttempt.userId = 'user-1';
      lockedAttempt.status = ExamAttemptStatus.TIMED_OUT;
      lockedAttempt.submittedAt = new Date('2026-11-15T08:40:00.000Z');

      const managerMock = {
        findOne: jest.fn().mockResolvedValue(lockedAttempt),
      };
      dataSourceMock.transaction.mockImplementation(async (cb) => cb(managerMock));

      await expect(service.submitAttempt('user-1', 'att-race')).rejects.toMatchObject({
        response: {
          errorCode: 'ERR_ATTEMPT_ALREADY_SUBMITTED',
          message: expect.any(String),
          status: ExamAttemptStatus.TIMED_OUT,
          submittedAt: lockedAttempt.submittedAt,
        },
      });

      // Verify lock isolation: findOne called without relations (PMR 029)
      expect(managerMock.findOne).toHaveBeenCalledWith(ExamAttempt, {
        where: { id: 'att-race' },
        lock: { mode: 'pessimistic_write' },
      });
      expect(gradingServiceMock.gradeAttemptInTransaction).not.toHaveBeenCalled();
    });

    it('should mark status = SUBMITTED when within 30s Grace Period and pass single timestamp now to gradingService (PMR 026 & PMR 029)', async () => {
      const nowMs = Date.now();
      const startedAt = new Date(nowMs - 3610 * 1000); // started 3610s ago
      const expiresAt = new Date(nowMs - 10 * 1000); // expired 10s ago (within 30s grace period; allocated = 3600s)

      const attempt = new ExamAttempt();
      attempt.id = 'att-grace';
      attempt.userId = 'user-1';
      attempt.status = ExamAttemptStatus.IN_PROGRESS;
      attempt.startedAt = startedAt;
      attempt.expiresAt = expiresAt;
      attemptRepoMock.findOne.mockResolvedValue(attempt);

      const managerMock = {
        findOne: jest.fn().mockResolvedValue(attempt),
      };
      dataSourceMock.transaction.mockImplementation(async (cb) => cb(managerMock));

      const result = await service.submitAttempt('user-1', 'att-grace');

      expect(result.status).toBe(ExamAttemptStatus.SUBMITTED);
      // Capped at allocatedSeconds = 3600 even though 3610s elapsed
      expect(result.durationSpentSeconds).toBe(3600);
      expect(result.totalScore).toBe(750);
      expect(gradingServiceMock.gradeAttemptInTransaction).toHaveBeenCalledWith(
        managerMock,
        attempt,
        result.submittedAt,
      );
    });

    it('should mark status = TIMED_OUT when submitted after expiresAt + 30s Grace Period and cap durationSpentSeconds at allocatedSeconds', async () => {
      const nowMs = Date.now();
      const startedAt = new Date(nowMs - 3700 * 1000); // started 3700s ago
      const expiresAt = new Date(nowMs - 100 * 1000); // expired 100s ago (> 30s grace; allocated = 3600s)

      const attempt = new ExamAttempt();
      attempt.id = 'att-late';
      attempt.userId = 'user-1';
      attempt.status = ExamAttemptStatus.IN_PROGRESS;
      attempt.startedAt = startedAt;
      attempt.expiresAt = expiresAt;
      attemptRepoMock.findOne.mockResolvedValue(attempt);

      const managerMock = {
        findOne: jest.fn().mockResolvedValue(attempt),
      };
      dataSourceMock.transaction.mockImplementation(async (cb) => cb(managerMock));

      const result = await service.submitAttempt('user-1', 'att-late');

      expect(result.status).toBe(ExamAttemptStatus.TIMED_OUT);
      expect(result.durationSpentSeconds).toBe(3600);
    });
  });

  describe('handleAutoSubmitExpiredAttempts (UC24)', () => {
    it('should drain expired attempts in batches using SKIP LOCKED, isolate per-attempt errors, and update status to TIMED_OUT', async () => {
      const batchQbMock = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest
          .fn()
          .mockResolvedValueOnce([{ id: 'att-exp-1' }, { id: 'att-exp-2' }])
          .mockResolvedValueOnce([]),
      };
      attemptRepoMock.createQueryBuilder.mockReturnValue(batchQbMock);

      const startedAt = new Date('2026-11-15T07:00:00.000Z');
      const expiresAt = new Date('2026-11-15T08:00:00.000Z'); // 3600s allocated

      const exp1 = new ExamAttempt();
      exp1.id = 'att-exp-1';
      exp1.status = ExamAttemptStatus.IN_PROGRESS;
      exp1.startedAt = startedAt;
      exp1.expiresAt = expiresAt;

      const exp2 = new ExamAttempt();
      exp2.id = 'att-exp-2';
      exp2.status = ExamAttemptStatus.IN_PROGRESS;
      exp2.startedAt = startedAt;
      exp2.expiresAt = expiresAt;

      let callIndex = 0;
      dataSourceMock.transaction.mockImplementation(async (cb) => {
        callIndex++;
        const currentAttempt = callIndex === 1 ? exp1 : exp2;
        const lockQb = {
          setLock: jest.fn().mockReturnThis(),
          setOnLocked: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(currentAttempt),
        };
        const manager = {
          getRepository: jest.fn().mockReturnValue({
            createQueryBuilder: jest.fn().mockReturnValue(lockQb),
          }),
        };
        if (callIndex === 1) {
          gradingServiceMock.gradeAttemptInTransaction.mockRejectedValueOnce(
            new Error('Simulated DB error on att-exp-1'),
          );
        }
        return cb(manager);
      });

      const summary = await service.handleAutoSubmitExpiredAttempts();

      expect(summary).toEqual({
        processed: 2,
        succeeded: 1,
        failed: 1,
      });
      expect(exp2.status).toBe(ExamAttemptStatus.TIMED_OUT);
      expect(exp2.submittedAt).toEqual(expiresAt);
      expect(exp2.durationSpentSeconds).toBe(3600);
    });
  });
});
