import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { SaveAnswerDto } from './request/save-answer.dto';
import { BatchSaveAnswersDto } from './request/batch-save-answers.dto';
import { SaveAnswerResponseDto } from './response/save-answer-response.dto';
import { BatchSaveAnswersResponseDto } from './response/batch-save-answers-response.dto';

describe('ExamAttempts Answers DTOs Validation & Serialization (UC22)', () => {
  describe('SaveAnswerDto', () => {
    it('should validate valid SaveAnswerDto with option UUID', async () => {
      const dto = plainToInstance(SaveAnswerDto, {
        questionId: '20000000-0000-4000-8000-000000000001',
        selectedOptionId: '30000000-0000-4000-8000-000000000001',
        isMarkedForReview: true,
        timeSpentSeconds: 45,
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate valid SaveAnswerDto with selectedOptionId: null (uncheck action)', async () => {
      const dto = plainToInstance(SaveAnswerDto, {
        questionId: '20000000-0000-4000-8000-000000000001',
        selectedOptionId: null,
        isMarkedForReview: false,
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate valid SaveAnswerDto with selectedOptionId: undefined (toggle review only)', async () => {
      const dto = plainToInstance(SaveAnswerDto, {
        questionId: '20000000-0000-4000-8000-000000000001',
        isMarkedForReview: true,
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail when questionId is not UUID', async () => {
      const dto = plainToInstance(SaveAnswerDto, {
        questionId: 'invalid-uuid',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('questionId');
    });

    it('should fail when selectedOptionId is invalid string (not UUID and not null)', async () => {
      const dto = plainToInstance(SaveAnswerDto, {
        questionId: '20000000-0000-4000-8000-000000000001',
        selectedOptionId: 'invalid-opt-uuid',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('selectedOptionId');
    });

    it('should fail when timeSpentSeconds is negative', async () => {
      const dto = plainToInstance(SaveAnswerDto, {
        questionId: '20000000-0000-4000-8000-000000000001',
        timeSpentSeconds: -1,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('timeSpentSeconds');
    });

    it('should fail when timeSpentSeconds exceeds 7200s (PMR 019 constraint)', async () => {
      const dto = plainToInstance(SaveAnswerDto, {
        questionId: '20000000-0000-4000-8000-000000000001',
        timeSpentSeconds: 7201,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('timeSpentSeconds');
    });
  });

  describe('BatchSaveAnswersDto', () => {
    it('should validate valid BatchSaveAnswersDto with clientAnsweredAt', async () => {
      const dto = plainToInstance(BatchSaveAnswersDto, {
        answers: [
          {
            questionId: '20000000-0000-4000-8000-000000000001',
            selectedOptionId: '30000000-0000-4000-8000-000000000001',
            isMarkedForReview: false,
            timeSpentSeconds: 15,
            clientAnsweredAt: '2026-11-01T08:12:00.000Z',
          },
          {
            questionId: '20000000-0000-4000-8000-000000000002',
            selectedOptionId: null,
            isMarkedForReview: true,
          },
        ],
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail when answers array is empty', async () => {
      const dto = plainToInstance(BatchSaveAnswersDto, {
        answers: [],
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('answers');
    });

    it('should fail when answers array exceeds 200 items', async () => {
      const item = {
        questionId: '20000000-0000-4000-8000-000000000001',
      };
      const items = Array.from({ length: 201 }, () => item);

      const dto = plainToInstance(BatchSaveAnswersDto, {
        answers: items,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('answers');
    });

    it('should fail when clientAnsweredAt is not a valid ISO 8601 string', async () => {
      const dto = plainToInstance(BatchSaveAnswersDto, {
        answers: [
          {
            questionId: '20000000-0000-4000-8000-000000000001',
            clientAnsweredAt: 'not-a-valid-date',
          },
        ],
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('Response DTOs', () => {
    it('should instantiate SaveAnswerResponseDto correctly', () => {
      const res = new SaveAnswerResponseDto();
      res.success = true;
      res.questionId = '20000000-0000-4000-8000-000000000001';
      res.selectedOptionId = '30000000-0000-4000-8000-000000000001';
      res.isMarkedForReview = false;
      res.answeredCount = 10;
      res.remainingSeconds = 3600;
      res.savedAt = new Date();

      expect(res.success).toBe(true);
      expect(res.answeredCount).toBe(10);
      expect(res.selectedOptionId).toBe('30000000-0000-4000-8000-000000000001');
    });

    it('should instantiate BatchSaveAnswersResponseDto correctly', () => {
      const res = new BatchSaveAnswersResponseDto();
      res.success = true;
      res.syncedCount = 2;
      res.failedCount = 1;
      res.failedItems = [
        {
          questionId: '20000000-0000-4000-8000-000000000099',
          reason: 'ERR_QUESTION_NOT_IN_ATTEMPT',
        },
      ];
      res.answeredCount = 12;
      res.remainingSeconds = 3500;
      res.serverTimeNow = new Date();

      expect(res.success).toBe(true);
      expect(res.syncedCount).toBe(2);
      expect(res.failedCount).toBe(1);
      expect(res.failedItems.length).toBe(1);
    });
  });
});
