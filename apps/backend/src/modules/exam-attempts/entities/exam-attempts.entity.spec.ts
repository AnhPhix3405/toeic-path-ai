import { getMetadataArgsStorage } from 'typeorm';
import { ExamAttemptStatus } from '../enums/exam-attempt-status.enum';
import { PartPracticeMode } from '../enums/part-practice-mode.enum';
import { ExamAttempt, numericPercentageTransformer } from './exam-attempt.entity';
import { ExamAttemptSnapshot } from './exam-attempt-snapshot.entity';
import { ExamAttemptAnswer } from './exam-attempt-answer.entity';
import { ExamAttemptsModule } from '../exam-attempts.module';

describe('Sprint 6 Exam Attempts Enums & Entities', () => {
  describe('Enums Definition', () => {
    it('should have all 4 ExamAttemptStatus values', () => {
      expect(ExamAttemptStatus.IN_PROGRESS).toBe('in_progress');
      expect(ExamAttemptStatus.SUBMITTED).toBe('submitted');
      expect(ExamAttemptStatus.ABANDONED).toBe('abandoned');
      expect(ExamAttemptStatus.TIMED_OUT).toBe('timed_out');
    });

    it('should have all 2 PartPracticeMode values', () => {
      expect(PartPracticeMode.FULL_EXAM).toBe('full_exam');
      expect(PartPracticeMode.PART_PRACTICE).toBe('part_practice');
    });
  });

  describe('Entities Instantiation', () => {
    it('should instantiate ExamAttempt with safe default values (PMR 020)', () => {
      const attempt = new ExamAttempt();
      attempt.userId = '11111111-1111-4111-8111-111111111111';
      attempt.examId = '22222222-2222-4222-8222-222222222222';
      attempt.totalQuestions = 200;
      attempt.expiresAt = new Date(Date.now() + 7200 * 1000);

      expect(attempt).toBeDefined();
      expect(attempt.status).toBe(ExamAttemptStatus.IN_PROGRESS);
      expect(attempt.mode).toBe(PartPracticeMode.FULL_EXAM);
      expect(attempt.answeredCount).toBe(0);
      expect(attempt.version).toBe(1);
    });

    it('should instantiate ExamAttemptSnapshot correctly', () => {
      const snapshot = new ExamAttemptSnapshot();
      snapshot.attemptId = '33333333-3333-4333-8333-333333333333';
      snapshot.examMetadata = { title: 'Test Exam' };
      snapshot.shuffledQuestions = [{ id: 'q1', content: null }];
      snapshot.answerKeySnapshot = { q1: 'opt1' };
      snapshot.isShuffledQuestions = false;
      snapshot.isShuffledOptions = true;

      expect(snapshot).toBeDefined();
      expect(snapshot.answerKeySnapshot['q1']).toBe('opt1');
      expect(snapshot.isShuffledQuestions).toBe(false);
      expect(snapshot.isShuffledOptions).toBe(true);
    });

    it('should instantiate ExamAttemptAnswer with default values', () => {
      const answer = new ExamAttemptAnswer();
      answer.attemptId = '33333333-3333-4333-8333-333333333333';
      answer.questionId = '44444444-4444-4444-8444-444444444444';
      answer.selectedOptionId = '55555555-5555-4555-8555-555555555555';

      expect(answer).toBeDefined();
      expect(answer.isMarkedForReview).toBe(false);
      expect(answer.timeSpentSeconds).toBe(0);
    });

    it('should initialize Sprint 7 grading fields on ExamAttempt as null by default and transform numeric accuracyPercentage', () => {
      const attempt = new ExamAttempt();
      expect(attempt.durationSpentSeconds).toBeNull();
      expect(attempt.totalScore).toBeNull();
      expect(attempt.listeningScore).toBeNull();
      expect(attempt.readingScore).toBeNull();
      expect(attempt.correctCount).toBeNull();
      expect(attempt.wrongCount).toBeNull();
      expect(attempt.skippedCount).toBeNull();
      expect(attempt.accuracyPercentage).toBeNull();
      expect(attempt.isPassed).toBeNull();
      expect(attempt.partBreakdown).toBeNull();
      expect(attempt.skillBreakdown).toBeNull();
      expect(attempt.gradedAt).toBeNull();

      expect(numericPercentageTransformer.from('85.50')).toBe(85.5);
      expect(numericPercentageTransformer.from(null)).toBeNull();
      expect(numericPercentageTransformer.from(undefined)).toBeNull();
      expect(numericPercentageTransformer.to(82.5)).toBe(82.5);
      expect(numericPercentageTransformer.to(null)).toBeNull();

      attempt.totalScore = 785;
      attempt.listeningScore = 410;
      attempt.readingScore = 375;
      attempt.accuracyPercentage = 82.5;
      attempt.partBreakdown = [
        {
          partNumber: 5,
          total: 30,
          correct: 25,
          wrong: 4,
          skipped: 1,
          accuracy: 83.33,
          avgTimeSeconds: 22,
        },
      ];
      expect(attempt.totalScore).toBe(785);
      expect(attempt.partBreakdown).toHaveLength(1);
    });

    it('should register Sprint 7 Check constraints and user_started_at index on ExamAttempt metadata', () => {
      const checks = getMetadataArgsStorage().checks.filter((c) => c.target === ExamAttempt);
      const checkNames = checks.map((c) => c.name);
      expect(checkNames).toEqual(
        expect.arrayContaining([
          'chk_attempt_duration_spent_non_negative',
          'chk_attempt_scores_range',
          'chk_attempt_counts_non_negative',
          'chk_attempt_accuracy_range',
        ]),
      );

      const indices = getMetadataArgsStorage().indices.filter((i) => i.target === ExamAttempt);
      expect(indices.map((i) => i.name)).toContain('idx_attempts_user_started_at');
    });

    it('should initialize ExamAttemptAnswer.isCorrect as null before grading and allow boolean assignment', () => {
      const answer = new ExamAttemptAnswer();
      expect(answer.isCorrect).toBeNull();
      answer.isCorrect = true;
      expect(answer.isCorrect).toBe(true);
    });
  });

  describe('ExamAttemptsModule Definition', () => {
    it('should be defined', () => {
      expect(ExamAttemptsModule).toBeDefined();
    });
  });
});
