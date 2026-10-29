import { ExamAttemptStatus } from '../enums/exam-attempt-status.enum';
import { PartPracticeMode } from '../enums/part-practice-mode.enum';
import { ExamAttempt } from './exam-attempt.entity';
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
  });

  describe('ExamAttemptsModule Definition', () => {
    it('should be defined', () => {
      expect(ExamAttemptsModule).toBeDefined();
    });
  });
});
