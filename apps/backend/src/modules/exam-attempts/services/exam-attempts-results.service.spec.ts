import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { Exam } from '../../exams/entities/exam.entity';
import { ScoreConversionType } from '../../exams/enums/score-conversion-type.enum';
import { QuestionGroup } from '../../question-groups/entities/question-group.entity';
import { Question } from '../../questions/entities/question.entity';
import { QueryAttemptHistoryDto } from '../dto/request/query-attempt-history.dto';
import { QueryAttemptReviewDto } from '../dto/request/query-attempt-review.dto';
import { ExamAttemptAnswer } from '../entities/exam-attempt-answer.entity';
import { ExamAttemptSnapshot } from '../entities/exam-attempt-snapshot.entity';
import { ExamAttempt } from '../entities/exam-attempt.entity';
import { AttemptReviewFilter } from '../enums/attempt-review-filter.enum';
import { ExamAttemptStatus } from '../enums/exam-attempt-status.enum';
import { PartPracticeMode } from '../enums/part-practice-mode.enum';
import { ExamAttemptsResultsService } from './exam-attempts-results.service';

describe('ExamAttemptsResultsService (UC26, UC27, UC28)', () => {
  let service: ExamAttemptsResultsService;
  let attemptRepoMock: {
    findOne: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let snapshotRepoMock: {
    findOne: jest.Mock;
  };
  let answerRepoMock: {
    find: jest.Mock;
  };
  let examRepoMock: {
    findOne: jest.Mock;
  };
  let questionRepoMock: {
    find: jest.Mock;
  };
  let questionGroupRepoMock: {
    find: jest.Mock;
  };

  beforeEach(() => {
    attemptRepoMock = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    snapshotRepoMock = {
      findOne: jest.fn(),
    };
    answerRepoMock = {
      find: jest.fn(),
    };
    examRepoMock = {
      findOne: jest.fn(),
    };
    questionRepoMock = {
      find: jest.fn(),
    };
    questionGroupRepoMock = {
      find: jest.fn(),
    };

    service = new ExamAttemptsResultsService(
      attemptRepoMock as unknown as Repository<ExamAttempt>,
      snapshotRepoMock as unknown as Repository<ExamAttemptSnapshot>,
      answerRepoMock as unknown as Repository<ExamAttemptAnswer>,
      examRepoMock as unknown as Repository<Exam>,
      questionRepoMock as unknown as Repository<Question>,
      questionGroupRepoMock as unknown as Repository<QuestionGroup>,
    );
  });

  describe('getAttemptResult (UC26)', () => {
    it('should throw NotFoundException (ERR_ATTEMPT_NOT_FOUND) when attempt does not exist', async () => {
      attemptRepoMock.findOne.mockResolvedValue(null);

      await expect(service.getAttemptResult('user-1', 'att-missing')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getAttemptResult('user-1', 'att-missing')).rejects.toMatchObject({
        response: expect.objectContaining({ errorCode: 'ERR_ATTEMPT_NOT_FOUND' }),
      });
    });

    it('should throw ForbiddenException (ERR_FORBIDDEN_ATTEMPT_ACCESS) when non-owner student accesses result, but allow admin', async () => {
      const attempt = new ExamAttempt();
      attempt.id = 'att-1';
      attempt.userId = 'owner-user';
      attempt.examId = 'exam-1';
      attempt.status = ExamAttemptStatus.SUBMITTED;
      attempt.mode = PartPracticeMode.FULL_EXAM;
      attempt.startedAt = new Date('2026-11-15T08:00:00.000Z');
      attempt.submittedAt = new Date('2026-11-15T09:50:00.000Z');
      attempt.gradedAt = new Date('2026-11-15T09:50:00.000Z');
      attempt.durationSpentSeconds = 6600;
      attempt.totalQuestions = 200;
      attempt.correctCount = 160;
      attempt.wrongCount = 30;
      attempt.skippedCount = 10;
      attempt.accuracyPercentage = 80;
      attemptRepoMock.findOne.mockResolvedValue(attempt);
      examRepoMock.findOne.mockResolvedValue({
        id: 'exam-1',
        title: 'ETS 2026 Test 1',
        scoreConversionType: ScoreConversionType.DEFAULT_ETS,
        passingScore: 650,
      });

      await expect(service.getAttemptResult('other-user', 'att-1', false)).rejects.toThrow(
        ForbiddenException,
      );

      const adminResult = await service.getAttemptResult('admin-user', 'att-1', true);
      expect(adminResult.attemptId).toBe('att-1');
    });

    it('should throw BadRequestException (ERR_ATTEMPT_NOT_SUBMITTED) when attempt is in_progress or abandoned (Zero Answer Leakage)', async () => {
      for (const status of [ExamAttemptStatus.IN_PROGRESS, ExamAttemptStatus.ABANDONED]) {
        const attempt = new ExamAttempt();
        attempt.id = 'att-1';
        attempt.userId = 'user-1';
        attempt.status = status;
        attemptRepoMock.findOne.mockResolvedValue(attempt);

        await expect(service.getAttemptResult('user-1', 'att-1')).rejects.toThrow(
          BadRequestException,
        );
        await expect(service.getAttemptResult('user-1', 'att-1')).rejects.toMatchObject({
          response: expect.objectContaining({ errorCode: 'ERR_ATTEMPT_NOT_SUBMITTED' }),
        });
      }
    });

    it('should throw ConflictException (ERR_ATTEMPT_NOT_GRADED) when attempt is submitted/timed_out but gradedAt is null', async () => {
      const attempt = new ExamAttempt();
      attempt.id = 'att-1';
      attempt.userId = 'user-1';
      attempt.status = ExamAttemptStatus.SUBMITTED;
      attempt.gradedAt = null;
      attemptRepoMock.findOne.mockResolvedValue(attempt);

      await expect(service.getAttemptResult('user-1', 'att-1')).rejects.toThrow(ConflictException);
      await expect(service.getAttemptResult('user-1', 'att-1')).rejects.toMatchObject({
        response: expect.objectContaining({ errorCode: 'ERR_ATTEMPT_NOT_GRADED' }),
      });
    });

    it('should return full ExamAttemptResultResponseDto without filtering exam.isDeleted and fallback to snapshot.examMetadata if exam row is missing (PMR 027 & PMR 030)', async () => {
      const attempt = new ExamAttempt();
      attempt.id = 'att-1';
      attempt.userId = 'user-1';
      attempt.examId = 'exam-soft-deleted';
      attempt.status = ExamAttemptStatus.TIMED_OUT;
      attempt.mode = PartPracticeMode.PART_PRACTICE;
      attempt.selectedParts = [5, 6];
      attempt.startedAt = new Date('2026-11-15T08:00:00.000Z');
      attempt.submittedAt = new Date('2026-11-15T08:30:00.000Z');
      attempt.gradedAt = new Date('2026-11-15T08:30:00.000Z');
      attempt.durationSpentSeconds = 1800;
      attempt.totalScore = null;
      attempt.listeningScore = null;
      attempt.readingScore = null;
      attempt.isPassed = null;
      attempt.totalQuestions = 46;
      attempt.correctCount = 36;
      attempt.wrongCount = 8;
      attempt.skippedCount = 2;
      attempt.accuracyPercentage = 78.26;
      attempt.partBreakdown = [
        {
          partNumber: 5,
          total: 30,
          correct: 24,
          wrong: 5,
          skipped: 1,
          accuracy: 80,
          avgTimeSeconds: 35,
        },
      ];
      attempt.skillBreakdown = [
        {
          skillId: 'sk-1',
          skillCode: 'GRAMMAR',
          skillName: 'Ngữ pháp',
          total: 30,
          correct: 24,
          wrong: 5,
          skipped: 1,
          accuracy: 80,
        },
      ];
      attemptRepoMock.findOne.mockResolvedValue(attempt);

      // Case 1: Soft-deleted exam is still returned by examRepo.findOne({ where: { id } })
      examRepoMock.findOne.mockResolvedValueOnce({
        id: 'exam-soft-deleted',
        title: 'Soft Deleted Mini Test',
        isDeleted: true,
        scoreConversionType: ScoreConversionType.RAW_PERCENTAGE,
        passingScore: 70,
      });

      const res1 = await service.getAttemptResult('user-1', 'att-1');
      expect(examRepoMock.findOne).toHaveBeenCalledWith({
        where: { id: 'exam-soft-deleted' },
      });
      expect(res1.examTitle).toBe('Soft Deleted Mini Test');
      expect(res1.scoreConversionType).toBe(ScoreConversionType.RAW_PERCENTAGE);
      expect(res1.passingScore).toBe(70);
      expect(res1.selectedParts).toEqual([5, 6]);
      expect(res1.partBreakdown).toHaveLength(1);
      expect(res1.skillBreakdown).toHaveLength(1);

      // Case 2: Exam record missing -> fallback to snapshot.examMetadata
      examRepoMock.findOne.mockResolvedValueOnce(null);
      snapshotRepoMock.findOne.mockResolvedValueOnce({
        id: 'snap-1',
        examMetadata: {
          title: 'Snapshot Fallback Exam Title',
          scoreConversionType: ScoreConversionType.DEFAULT_ETS,
          passingScore: 600,
        },
      });

      const res2 = await service.getAttemptResult('user-1', 'att-1');
      expect(res2.examTitle).toBe('Snapshot Fallback Exam Title');
      expect(res2.scoreConversionType).toBe(ScoreConversionType.DEFAULT_ETS);
      expect(res2.passingScore).toBe(600);
    });
  });

  describe('getAttemptHistory (UC27)', () => {
    it('should select scalar columns plus exam.id and exam.title (excluding JSONB columns), normalize YYYY-MM-DD toDate to 23:59:59.999Z, and return flat PaginatedExamAttemptHistoryResponseDto (PMR 027 & PMR 030)', async () => {
      const qbMock = {
        leftJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([
          [
            {
              id: 'att-1',
              examId: 'exam-1',
              exam: { id: 'exam-1', title: 'ETS Test 1' },
              mode: PartPracticeMode.FULL_EXAM,
              selectedParts: null,
              status: ExamAttemptStatus.SUBMITTED,
              totalScore: 810,
              listeningScore: 420,
              readingScore: 390,
              correctCount: 162,
              totalQuestions: 200,
              accuracyPercentage: '81.00',
              durationSpentSeconds: 6500,
              isPassed: true,
              startedAt: new Date('2026-11-15T10:00:00.000Z'),
              submittedAt: new Date('2026-11-15T11:48:20.000Z'),
            },
            {
              id: 'att-2',
              examId: 'exam-2',
              exam: undefined,
              mode: PartPracticeMode.PART_PRACTICE,
              selectedParts: [1, 2],
              status: ExamAttemptStatus.ABANDONED,
              totalScore: null,
              listeningScore: null,
              readingScore: null,
              correctCount: null,
              totalQuestions: 31,
              accuracyPercentage: null,
              durationSpentSeconds: null,
              isPassed: null,
              startedAt: new Date('2026-11-14T10:00:00.000Z'),
              submittedAt: null,
            },
          ],
          2,
        ]),
      };
      attemptRepoMock.createQueryBuilder.mockReturnValue(qbMock);

      const query: QueryAttemptHistoryDto = {
        page: 1,
        limit: 10,
        examId: 'exam-1',
        mode: PartPracticeMode.FULL_EXAM,
        status: ExamAttemptStatus.SUBMITTED,
        fromDate: '2026-11-01',
        toDate: '2026-11-15',
      };

      const result = await service.getAttemptHistory('user-1', query);

      const selectedFields: string[] = qbMock.select.mock.calls[0][0];
      expect(selectedFields).toContain('exam.id');
      expect(selectedFields).toContain('exam.title');
      expect(selectedFields).not.toContain('attempt.partBreakdown');
      expect(selectedFields).not.toContain('attempt.skillBreakdown');

      // Check date normalization for YYYY-MM-DD
      const toDateCall = qbMock.andWhere.mock.calls.find((call: unknown[]) =>
        String(call[0]).includes(':toDate'),
      );
      expect(toDateCall).toBeDefined();
      expect((toDateCall[1].toDate as Date).toISOString()).toBe('2026-11-15T23:59:59.999Z');

      expect(result).toEqual({
        items: [
          expect.objectContaining({
            attemptId: 'att-1',
            examId: 'exam-1',
            examTitle: 'ETS Test 1',
            totalScore: 810,
            accuracyPercentage: 81,
            durationSpentSeconds: 6500,
            isPassed: true,
          }),
          expect.objectContaining({
            attemptId: 'att-2',
            examId: 'exam-2',
            examTitle: 'Đề thi không xác định',
            accuracyPercentage: null,
          }),
        ],
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should preserve full ISO timestamp in toDate and throw BadRequestException (ERR_INVALID_DATE_RANGE) when fromDate > toDate (PMR 030)', async () => {
      await expect(
        service.getAttemptHistory('user-1', {
          fromDate: '2026-11-16T00:00:00.000Z',
          toDate: '2026-11-15T14:30:00.000Z',
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.getAttemptHistory('user-1', {
          fromDate: '2026-11-16',
          toDate: '2026-11-15',
        }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ errorCode: 'ERR_INVALID_DATE_RANGE' }),
      });
    });
  });

  describe('getAttemptReview (UC28)', () => {
    it('should enforce ownership, state guards (ERR_ATTEMPT_NOT_SUBMITTED, ERR_ATTEMPT_NOT_GRADED), part_practice boundary (ERR_PART_NOT_IN_ATTEMPT), and missing snapshot guard (500 ERR_SNAPSHOT_NOT_FOUND)', async () => {
      const attempt = new ExamAttempt();
      attempt.id = 'att-1';
      attempt.userId = 'user-1';
      attempt.mode = PartPracticeMode.PART_PRACTICE;
      attempt.selectedParts = [5];
      attempt.status = ExamAttemptStatus.IN_PROGRESS;
      attempt.gradedAt = new Date();
      attemptRepoMock.findOne.mockResolvedValue(attempt);

      // 1. Not submitted
      await expect(service.getAttemptReview('user-1', 'att-1', {})).rejects.toMatchObject({
        response: expect.objectContaining({ errorCode: 'ERR_ATTEMPT_NOT_SUBMITTED' }),
      });

      // 2. Submitted but not graded
      attempt.status = ExamAttemptStatus.SUBMITTED;
      attempt.gradedAt = null;
      await expect(service.getAttemptReview('user-1', 'att-1', {})).rejects.toMatchObject({
        response: expect.objectContaining({ errorCode: 'ERR_ATTEMPT_NOT_GRADED' }),
      });

      // 3. Part not in attempt for part_practice
      attempt.gradedAt = new Date();
      await expect(
        service.getAttemptReview('user-1', 'att-1', { partNumber: 7 }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ errorCode: 'ERR_PART_NOT_IN_ATTEMPT' }),
      });

      // 4. Missing snapshot -> 500 ERR_SNAPSHOT_NOT_FOUND
      snapshotRepoMock.findOne.mockResolvedValue(null);
      await expect(service.getAttemptReview('user-1', 'att-1', { partNumber: 5 })).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should preserve shuffled option order/labels A-D, load transcript & explanation for single (Part 1, 2) and group (Part 3, 4) questions, compute part-scoped filterCounts before filtering, separate wrong vs skipped, and deduplicate questionGroups AFTER filtering (PMR 027 & PMR 030)', async () => {
      const attempt = new ExamAttempt();
      attempt.id = 'att-1';
      attempt.userId = 'user-1';
      attempt.mode = PartPracticeMode.FULL_EXAM;
      attempt.status = ExamAttemptStatus.SUBMITTED;
      attempt.gradedAt = new Date('2026-11-15T10:00:00.000Z');
      attemptRepoMock.findOne.mockResolvedValue(attempt);

      const snapshot = new ExamAttemptSnapshot();
      snapshot.attemptId = 'att-1';
      snapshot.shuffledQuestions = [
        // Q1: Part 1 single question (correct, content: null per Rule #1002)
        {
          id: 'q1',
          partNumber: 1,
          orderIndex: 1,
          originalQuestionNumber: 1,
          questionGroupId: null,
          content: null,
          audioUrl: 'https://cdn/q1.mp3',
          imageUrl: 'https://cdn/q1.png',
          options: [
            { id: 'opt-1-b', label: 'A', content: null },
            { id: 'opt-1-a', label: 'B', content: null },
          ],
        },
        // Q2: Part 3 group G1 (wrong, marked)
        {
          id: 'q2',
          partNumber: 3,
          orderIndex: 2,
          originalQuestionNumber: 32,
          questionGroupId: 'g1',
          questionGroup: {
            id: 'g1',
            title: 'Conversation 1',
            context: 'Snap transcript G1',
            audioUrl: 'https://cdn/g1.mp3',
          },
          content: 'Where does the speaker work?',
          options: [
            { id: 'opt-2-wrong', label: 'A', content: 'At a bank' },
            { id: 'opt-2-correct', label: 'B', content: 'At a hotel' },
          ],
        },
        // Q3: Part 3 group G2 (review-only skipped: selectedOptionId = null, isMarkedForReview = true)
        {
          id: 'q3',
          partNumber: 3,
          orderIndex: 3,
          originalQuestionNumber: 35,
          questionGroupId: 'g2',
          questionGroup: {
            id: 'g2',
            title: 'Conversation 2',
            context: 'Snap transcript G2',
            audioUrl: 'https://cdn/g2.mp3',
          },
          content: 'What is the problem?',
          options: [
            { id: 'opt-3-a', label: 'A', content: 'Late flight' },
            { id: 'opt-3-b', label: 'B', content: 'Lost key' },
          ],
        },
      ];
      snapshot.answerKeySnapshot = {
        q1: 'opt-1-a',
        q2: 'opt-2-correct',
        q3: 'opt-3-a',
      };
      snapshotRepoMock.findOne.mockResolvedValue(snapshot);

      answerRepoMock.find.mockResolvedValue([
        {
          attemptId: 'att-1',
          questionId: 'q1',
          selectedOptionId: 'opt-1-a',
          isCorrect: true,
          isMarkedForReview: false,
          timeSpentSeconds: 12,
        },
        {
          attemptId: 'att-1',
          questionId: 'q2',
          selectedOptionId: 'opt-2-wrong',
          isCorrect: false,
          isMarkedForReview: true,
          timeSpentSeconds: 25,
        },
        {
          attemptId: 'att-1',
          questionId: 'q3',
          selectedOptionId: null,
          isCorrect: false,
          isMarkedForReview: true,
          timeSpentSeconds: 5,
        },
      ]);

      questionRepoMock.find.mockResolvedValue([
        {
          id: 'q1',
          explanation: 'Explanation Q1',
          transcript: '(A) Correct photo description',
        },
        {
          id: 'q2',
          explanation: 'Explanation Q2',
        },
        {
          id: 'q3',
          explanation: 'Explanation Q3',
        },
      ]);

      questionGroupRepoMock.find.mockResolvedValue([
        {
          id: 'g1',
          title: 'Conversation 1',
          context: 'Updated live transcript G1',
        },
        {
          id: 'g2',
          title: 'Conversation 2',
          context: 'Updated live transcript G2',
        },
      ]);

      // Call 1: Filter by filter=WRONG across all parts
      const wrongReview: QueryAttemptReviewDto = {
        filter: AttemptReviewFilter.WRONG,
      };
      const resWrong = await service.getAttemptReview('user-1', 'att-1', wrongReview);

      // filterCounts must reflect all 3 questions before filter=WRONG is applied:
      // all=3, correct=1 (q1), wrong=1 (q2), skipped=1 (q3), marked=2 (q2, q3)
      expect(resWrong.filterCounts).toEqual({
        all: 3,
        correct: 1,
        wrong: 1,
        skipped: 1,
        marked: 2,
      });

      // Only q2 matches WRONG (q3 is skipped even though it has a review-only row)
      expect(resWrong.questions).toHaveLength(1);
      expect(resWrong.questions[0].id).toBe('q2');
      expect(resWrong.questions[0].explanation).toBe('Explanation Q2');
      expect(resWrong.questions[0].options).toEqual([
        { id: 'opt-2-wrong', label: 'A', content: 'At a bank', isCorrect: false },
        { id: 'opt-2-correct', label: 'B', content: 'At a hotel', isCorrect: true },
      ]);

      // Deduplicated questionGroups AFTER filtering: only g1 is returned, NOT g2!
      expect(resWrong.questionGroups).toHaveLength(1);
      expect(resWrong.questionGroups[0].id).toBe('g1');
      expect(resWrong.questionGroups[0].transcript).toBe('Updated live transcript G1');

      // Call 2: Part 1 review (check transcript on single question & Rule #1002 content: null)
      const resPart1 = await service.getAttemptReview('user-1', 'att-1', {
        partNumber: 1,
        filter: AttemptReviewFilter.ALL,
      });
      expect(resPart1.filterCounts).toEqual({
        all: 1,
        correct: 1,
        wrong: 0,
        skipped: 0,
        marked: 0,
      });
      expect(resPart1.questions[0].content).toBeNull();
      expect(resPart1.questions[0].transcript).toBe('(A) Correct photo description');
      expect(resPart1.questions[0].options).toEqual([
        { id: 'opt-1-b', label: 'A', content: null, isCorrect: false },
        { id: 'opt-1-a', label: 'B', content: null, isCorrect: true },
      ]);
    });
  });
});
