import { InternalServerErrorException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import {
  convertRawToEtsListening,
  convertRawToEtsReading,
  ETS_LISTENING_SCORE_TABLE,
  ETS_READING_SCORE_TABLE,
} from '../constants/ets-score-table.constant';
import { ExamAttemptsGradingService } from './exam-attempts-grading.service';
import { ExamAttempt } from '../entities/exam-attempt.entity';
import { ExamAttemptSnapshot } from '../entities/exam-attempt-snapshot.entity';
import { ExamAttemptAnswer } from '../entities/exam-attempt-answer.entity';
import { Exam } from '../../exams/entities/exam.entity';
import { Question } from '../../questions/entities/question.entity';
import { PartPracticeMode } from '../enums/part-practice-mode.enum';
import { ExamAttemptStatus } from '../enums/exam-attempt-status.enum';
import { ScoreConversionType } from '../../exams/enums/score-conversion-type.enum';

describe('ExamAttemptsGradingService & ETS Score Table (UC25)', () => {
  let service: ExamAttemptsGradingService;

  beforeEach(() => {
    service = new ExamAttemptsGradingService();
  });

  describe('ETS Score Conversion Table', () => {
    it('should have 101 entries (0..100) bounded between 5 and 495 in multiples of 5', () => {
      expect(ETS_LISTENING_SCORE_TABLE).toHaveLength(101);
      expect(ETS_READING_SCORE_TABLE).toHaveLength(101);
      expect(convertRawToEtsListening(0)).toBe(5);
      expect(convertRawToEtsListening(100)).toBe(495);
      expect(convertRawToEtsReading(0)).toBe(5);
      expect(convertRawToEtsReading(100)).toBe(495);
      expect(convertRawToEtsListening(-5)).toBe(5);
      expect(convertRawToEtsListening(105)).toBe(495);
      expect(convertRawToEtsReading(-10)).toBe(5);
      expect(convertRawToEtsReading(120)).toBe(495);
      expect(convertRawToEtsListening(50)).toBeGreaterThanOrEqual(5);
      expect(convertRawToEtsReading(50)).toBeGreaterThanOrEqual(5);
    });
  });

  describe('gradeAttemptInTransaction', () => {
    const createMockManager = (options: {
      snapshot?: ExamAttemptSnapshot | null;
      answers?: ExamAttemptAnswer[];
      exam?: Exam | null;
      questionsWithSkills?: Partial<Question>[];
    }) => {
      const savedEntities: Array<{ target: unknown; entity: unknown }> = [];
      const findOneCalls: Array<{ target: unknown; options: unknown }> = [];

      const questionRepo = {
        find: jest.fn().mockResolvedValue(options.questionsWithSkills ?? []),
      };

      const manager = {
        findOne: jest.fn(async (target: unknown, findOptions: unknown) => {
          findOneCalls.push({ target, options: findOptions });
          if (target === ExamAttemptSnapshot) {
            return options.snapshot ?? null;
          }
          if (target === Exam) {
            return options.exam ?? null;
          }
          return null;
        }),
        find: jest.fn(async (target: unknown) => {
          if (target === ExamAttemptAnswer) {
            return options.answers ?? [];
          }
          return [];
        }),
        getRepository: jest.fn((target: unknown) => {
          if (target === Question) {
            return questionRepo;
          }
          return {};
        }),
        save: jest.fn(async (target: unknown, entity: unknown) => {
          savedEntities.push({ target, entity });
          return entity;
        }),
        _savedEntities: savedEntities,
        _findOneCalls: findOneCalls,
      };

      return manager as unknown as EntityManager & {
        _savedEntities: typeof savedEntities;
        _findOneCalls: typeof findOneCalls;
      };
    };

    it('should throw InternalServerErrorException (ERR_SNAPSHOT_NOT_FOUND) when snapshot is missing or empty', async () => {
      const attempt = new ExamAttempt();
      attempt.id = 'att-1';
      attempt.examId = 'exam-1';

      const managerMissing = createMockManager({ snapshot: null });
      await expect(service.gradeAttemptInTransaction(managerMissing, attempt)).rejects.toThrow(
        InternalServerErrorException,
      );

      const emptySnapshot = new ExamAttemptSnapshot();
      emptySnapshot.attemptId = 'att-1';
      emptySnapshot.shuffledQuestions = [];
      emptySnapshot.answerKeySnapshot = {};
      const managerEmpty = createMockManager({ snapshot: emptySnapshot });

      await expect(service.gradeAttemptInTransaction(managerEmpty, attempt)).rejects.toMatchObject({
        response: expect.objectContaining({
          errorCode: 'ERR_SNAPSHOT_NOT_FOUND',
        }),
      });
    });

    it('should grade full_exam with DEFAULT_ETS, handle flagged-only answer as skipped, sort breakdowns, and query Exam without status/isDeleted filters (PMR 026 & PMR 029)', async () => {
      const attempt = new ExamAttempt();
      attempt.id = 'att-full-1';
      attempt.examId = 'exam-1';
      attempt.mode = PartPracticeMode.FULL_EXAM;
      attempt.status = ExamAttemptStatus.SUBMITTED;
      attempt.totalQuestions = 4;

      const snapshot = new ExamAttemptSnapshot();
      snapshot.attemptId = 'att-full-1';
      snapshot.examMetadata = {
        scoreConversionType: ScoreConversionType.DEFAULT_ETS,
      };
      // Put Part 5 before Part 1 to test partBreakdown sorting by partNumber ASC
      snapshot.shuffledQuestions = [
        { id: 'q-p5-1', partNumber: 5 },
        { id: 'q-p5-2', partNumber: 5 },
        { id: 'q-p1-1', partNumber: 1 },
        { id: 'q-p2-1', partNumber: 2 },
      ];
      snapshot.answerKeySnapshot = {
        'q-p5-1': 'opt-correct-1',
        'q-p5-2': 'opt-correct-2',
        'q-p1-1': 'opt-correct-3',
        'q-p2-1': 'opt-correct-4',
      };

      // q-p5-1: correct (20s)
      const ans1 = new ExamAttemptAnswer();
      ans1.questionId = 'q-p5-1';
      ans1.selectedOptionId = 'opt-correct-1';
      ans1.timeSpentSeconds = 20;

      // q-p5-2: only flagged for review, selectedOptionId = null (10s) -> must count as skipped & isCorrect = false
      const ans2 = new ExamAttemptAnswer();
      ans2.questionId = 'q-p5-2';
      ans2.selectedOptionId = null;
      ans2.isMarkedForReview = true;
      ans2.timeSpentSeconds = 10;

      // q-p1-1: wrong (15s)
      const ans3 = new ExamAttemptAnswer();
      ans3.questionId = 'q-p1-1';
      ans3.selectedOptionId = 'opt-wrong-3';
      ans3.timeSpentSeconds = 15;

      // q-p2-1: completely untouched (no record in exam_attempt_answers) -> skipped

      const exam = new Exam();
      exam.id = 'exam-1';
      exam.scoreConversionType = ScoreConversionType.DEFAULT_ETS;
      exam.passingScore = 200;

      // Skills in reverse code order ('VOCAB', 'GRAMMAR') to test skillCode ASC sorting
      const questionsWithSkills: Partial<Question>[] = [
        {
          id: 'q-p5-1',
          skills: [
            { id: 's-2', code: 'VOCAB', name: 'Vocabulary' } as never,
            { id: 's-1', code: 'GRAMMAR', name: 'Grammar' } as never,
          ],
        },
        {
          id: 'q-p5-2',
          skills: [{ id: 's-1', code: 'GRAMMAR', name: 'Grammar' } as never],
        },
      ];

      const manager = createMockManager({
        snapshot,
        answers: [ans1, ans2, ans3],
        exam,
        questionsWithSkills,
      });

      const gradedAt = new Date('2026-11-15T09:00:00.000Z');
      const result = await service.gradeAttemptInTransaction(manager, attempt, gradedAt);

      // Verify Exam lookup only filters by id (PMR 029)
      const examFindCall = manager._findOneCalls.find((c) => c.target === Exam);
      expect(examFindCall?.options).toEqual({ where: { id: 'exam-1' } });

      // Counts: 1 correct (q-p5-1), 1 wrong (q-p1-1), 2 skipped (q-p5-2 & q-p2-1)
      expect(result.correctCount).toBe(1);
      expect(result.wrongCount).toBe(1);
      expect(result.skippedCount).toBe(2);
      expect(result.accuracyPercentage).toBe(25);
      expect(result.gradedAt).toEqual(gradedAt);

      // Existing answer rows updated in-place without inserting a 4th row for q-p2-1
      expect(ans1.isCorrect).toBe(true);
      expect(ans2.isCorrect).toBe(false);
      expect(ans3.isCorrect).toBe(false);

      // Listening: 0/2 -> scaledRaw 0 -> 5; Reading: 1/2 -> scaledRaw 50 -> convertRawToEtsReading(50)
      expect(result.listeningScore).toBe(convertRawToEtsListening(0));
      expect(result.readingScore).toBe(convertRawToEtsReading(50));
      expect(result.totalScore).toBe(convertRawToEtsListening(0) + convertRawToEtsReading(50));
      expect(result.isPassed).toBe(result.totalScore! >= 200);

      // partBreakdown sorted by partNumber ASC: [1, 2, 5]
      expect(result.partBreakdown?.map((p) => p.partNumber)).toEqual([1, 2, 5]);
      const part5 = result.partBreakdown?.find((p) => p.partNumber === 5);
      expect(part5).toEqual({
        partNumber: 5,
        total: 2,
        correct: 1,
        wrong: 0,
        skipped: 1,
        accuracy: 50,
        avgTimeSeconds: 15, // (20 + 10) / 2
      });

      // skillBreakdown sorted by skillCode ASC: ['GRAMMAR', 'VOCAB']
      expect(result.skillBreakdown?.map((s) => s.skillCode)).toEqual(['GRAMMAR', 'VOCAB']);
      expect(result.skillBreakdown?.[0]).toEqual({
        skillId: 's-1',
        skillCode: 'GRAMMAR',
        skillName: 'Grammar',
        total: 2,
        correct: 1,
        wrong: 0,
        skipped: 1,
        accuracy: 50,
      });
    });

    it('should return readingScore = null and totalScore = null for single-skill full_exam (Listening only - PMR 025)', async () => {
      const attempt = new ExamAttempt();
      attempt.id = 'att-single-skill';
      attempt.examId = 'exam-listen-only';
      attempt.mode = PartPracticeMode.FULL_EXAM;
      attempt.totalQuestions = 2;

      const snapshot = new ExamAttemptSnapshot();
      snapshot.attemptId = 'att-single-skill';
      snapshot.examMetadata = {
        scoreConversionType: ScoreConversionType.CUSTOM, // Also tests CUSTOM fallback to DEFAULT_ETS
      };
      snapshot.shuffledQuestions = [
        { id: 'q1', partNumber: 1 },
        { id: 'q2', partNumber: 2 },
      ];
      snapshot.answerKeySnapshot = { q1: 'o1', q2: 'o2' };

      const a1 = new ExamAttemptAnswer();
      a1.questionId = 'q1';
      a1.selectedOptionId = 'o1';

      const exam = new Exam();
      exam.id = 'exam-listen-only';
      exam.scoreConversionType = ScoreConversionType.CUSTOM;
      exam.passingScore = 400;

      const manager = createMockManager({
        snapshot,
        answers: [a1],
        exam,
      });

      const result = await service.gradeAttemptInTransaction(manager, attempt);

      expect(result.listeningScore).toBe(convertRawToEtsListening(50));
      expect(result.readingScore).toBeNull();
      expect(result.totalScore).toBeNull();
      expect(result.isPassed).toBeNull();
    });

    it('should set ETS scores to null and evaluate isPassed against accuracyPercentage for RAW_PERCENTAGE mode', async () => {
      const attempt = new ExamAttempt();
      attempt.id = 'att-raw';
      attempt.examId = 'exam-raw';
      attempt.mode = PartPracticeMode.FULL_EXAM;
      attempt.totalQuestions = 2;

      const snapshot = new ExamAttemptSnapshot();
      snapshot.attemptId = 'att-raw';
      snapshot.examMetadata = {
        scoreConversionType: ScoreConversionType.RAW_PERCENTAGE,
      };
      snapshot.shuffledQuestions = [
        { id: 'q1', partNumber: 1 },
        { id: 'q2', partNumber: 5 },
      ];
      snapshot.answerKeySnapshot = { q1: 'o1', q2: 'o2' };

      const a1 = new ExamAttemptAnswer();
      a1.questionId = 'q1';
      a1.selectedOptionId = 'o1';
      const a2 = new ExamAttemptAnswer();
      a2.questionId = 'q2';
      a2.selectedOptionId = 'o2';

      const exam = new Exam();
      exam.id = 'exam-raw';
      exam.scoreConversionType = ScoreConversionType.RAW_PERCENTAGE;
      exam.passingScore = 80;

      const manager = createMockManager({
        snapshot,
        answers: [a1, a2],
        exam,
      });

      const result = await service.gradeAttemptInTransaction(manager, attempt);

      expect(result.listeningScore).toBeNull();
      expect(result.readingScore).toBeNull();
      expect(result.totalScore).toBeNull();
      expect(result.accuracyPercentage).toBe(100);
      expect(result.isPassed).toBe(true);
    });

    it('should set ETS scores and isPassed to null for part_practice mode and return empty skillBreakdown when no skills exist', async () => {
      const attempt = new ExamAttempt();
      attempt.id = 'att-part';
      attempt.examId = 'exam-1';
      attempt.mode = PartPracticeMode.PART_PRACTICE;
      attempt.selectedParts = [5];
      attempt.totalQuestions = 3;

      const snapshot = new ExamAttemptSnapshot();
      snapshot.attemptId = 'att-part';
      snapshot.examMetadata = {};
      snapshot.shuffledQuestions = [
        { id: 'q1', partNumber: 5 },
        { id: 'q2', partNumber: 5 },
        { id: 'q3', partNumber: 5 },
      ];
      snapshot.answerKeySnapshot = { q1: 'o1', q2: 'o2', q3: 'o3' };

      const a1 = new ExamAttemptAnswer();
      a1.questionId = 'q1';
      a1.selectedOptionId = 'o1';
      a1.timeSpentSeconds = 12;

      const manager = createMockManager({
        snapshot,
        answers: [a1],
        exam: null,
        questionsWithSkills: [],
      });

      const result = await service.gradeAttemptInTransaction(manager, attempt);

      expect(result.listeningScore).toBeNull();
      expect(result.readingScore).toBeNull();
      expect(result.totalScore).toBeNull();
      expect(result.isPassed).toBeNull();
      expect(result.accuracyPercentage).toBe(33.33);
      expect(result.partBreakdown).toEqual([
        {
          partNumber: 5,
          total: 3,
          correct: 1,
          wrong: 0,
          skipped: 2,
          accuracy: 33.33,
          avgTimeSeconds: 4, // 12 / 3
        },
      ]);
      expect(result.skillBreakdown).toEqual([]);
    });
  });
});
