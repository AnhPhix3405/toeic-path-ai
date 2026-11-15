import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AttemptReviewFilter } from '../enums/attempt-review-filter.enum';
import { ExamAttemptStatus } from '../enums/exam-attempt-status.enum';
import { PartPracticeMode } from '../enums/part-practice-mode.enum';
import { QueryAttemptHistoryDto } from './request/query-attempt-history.dto';
import { QueryAttemptReviewDto } from './request/query-attempt-review.dto';

describe('Exam Attempts Results & Review DTOs (UC26, UC27, UC28)', () => {
  describe('QueryAttemptHistoryDto (UC27)', () => {
    it('should accept empty payload with defaults page=1 and limit=10', async () => {
      const dto = plainToInstance(QueryAttemptHistoryDto, {});
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.page).toBe(1);
      expect(dto.limit).toBe(10);
    });

    it('should accept valid filters (page, limit<=50, examId, mode, status, fromDate, toDate)', async () => {
      const dto = plainToInstance(QueryAttemptHistoryDto, {
        page: '2',
        limit: '50',
        examId: '10000000-0000-4000-8000-000000000001',
        mode: PartPracticeMode.FULL_EXAM,
        status: ExamAttemptStatus.SUBMITTED,
        fromDate: '2026-11-01',
        toDate: '2026-11-15',
      });
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.page).toBe(2);
      expect(dto.limit).toBe(50);
    });

    it('should reject limit > 50, page < 1, invalid examId, invalid mode/status, and invalid dates', async () => {
      const dto = plainToInstance(QueryAttemptHistoryDto, {
        page: 0,
        limit: 51,
        examId: 'not-a-uuid',
        mode: 'invalid_mode',
        status: 'invalid_status',
        fromDate: 'not-a-date',
        toDate: 'also-not-a-date',
      });
      const errors = await validate(dto);
      const props = errors.map((e) => e.property);

      expect(props).toEqual(
        expect.arrayContaining(['page', 'limit', 'examId', 'mode', 'status', 'fromDate', 'toDate']),
      );
    });
  });

  describe('QueryAttemptReviewDto (UC28)', () => {
    it('should accept empty payload and default filter to ALL', async () => {
      const dto = plainToInstance(QueryAttemptReviewDto, {});
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.filter).toBe(AttemptReviewFilter.ALL);
      expect(dto.partNumber).toBeUndefined();
    });

    it('should accept valid partNumber (1..7) and filter enum', async () => {
      const dto = plainToInstance(QueryAttemptReviewDto, {
        partNumber: '5',
        filter: AttemptReviewFilter.WRONG,
      });
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.partNumber).toBe(5);
      expect(dto.filter).toBe(AttemptReviewFilter.WRONG);
    });

    it('should reject partNumber outside 1..7 and invalid filter value', async () => {
      const dtoLow = plainToInstance(QueryAttemptReviewDto, {
        partNumber: 0,
        filter: 'invalid_filter',
      });
      const errorsLow = await validate(dtoLow);
      expect(errorsLow.map((e) => e.property)).toEqual(
        expect.arrayContaining(['partNumber', 'filter']),
      );

      const dtoHigh = plainToInstance(QueryAttemptReviewDto, {
        partNumber: 8,
      });
      const errorsHigh = await validate(dtoHigh);
      expect(errorsHigh.map((e) => e.property)).toContain('partNumber');
    });
  });
});
