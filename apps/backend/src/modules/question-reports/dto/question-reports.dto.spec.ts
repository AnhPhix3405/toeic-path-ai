import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { QuestionReportReason } from '../enums/question-report-reason.enum';
import { QuestionReportStatus } from '../enums/question-report-status.enum';
import { CreateQuestionReportDto } from './request/create-question-report.dto';
import { QueryMyQuestionReportsDto } from './request/query-my-question-reports.dto';
import { QueryQuestionReportsDto } from './request/query-question-reports.dto';
import { ResolveQuestionReportDto } from './request/resolve-question-report.dto';

describe('Question Reports DTOs (UC29 & UC49)', () => {
  describe('CreateQuestionReportDto (UC29)', () => {
    it('should accept non-other reason without description', async () => {
      const dto = plainToInstance(CreateQuestionReportDto, {
        reason: QuestionReportReason.WRONG_ANSWER,
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should require description (10..1000 chars after trim) when reason is OTHER and reject whitespace-only strings (PMR 031)', async () => {
      const missingDesc = plainToInstance(CreateQuestionReportDto, {
        reason: QuestionReportReason.OTHER,
      });
      expect((await validate(missingDesc)).map((e) => e.property)).toContain('description');

      const whitespaceDesc = plainToInstance(CreateQuestionReportDto, {
        reason: QuestionReportReason.OTHER,
        description: '          ',
      });
      expect((await validate(whitespaceDesc)).map((e) => e.property)).toContain('description');

      const shortDesc = plainToInstance(CreateQuestionReportDto, {
        reason: QuestionReportReason.OTHER,
        description: '  too short ',
      });
      expect((await validate(shortDesc)).map((e) => e.property)).toContain('description');

      const validDto = plainToInstance(CreateQuestionReportDto, {
        reason: QuestionReportReason.OTHER,
        description: '   Audio bị rè từ giây thứ 15 đến giây 20   ',
        attemptId: '10000000-0000-4000-8000-000000000001',
      });
      const validErrors = await validate(validDto);
      expect(validErrors).toHaveLength(0);
      expect(validDto.description).toBe('Audio bị rè từ giây thứ 15 đến giây 20');
    });

    it('should reject invalid attemptId UUID', async () => {
      const dto = plainToInstance(CreateQuestionReportDto, {
        reason: QuestionReportReason.TYPO_ERROR,
        attemptId: 'invalid-uuid',
      });
      const errors = await validate(dto);
      expect(errors.map((e) => e.property)).toContain('attemptId');
    });
  });

  describe('ResolveQuestionReportDto (UC49)', () => {
    it('should reject status=PENDING and accept IN_REVIEW without resolutionNote (PMR 031)', async () => {
      const pendingDto = plainToInstance(ResolveQuestionReportDto, {
        status: QuestionReportStatus.PENDING,
      });
      expect((await validate(pendingDto)).map((e) => e.property)).toContain('status');

      const inReviewDto = plainToInstance(ResolveQuestionReportDto, {
        status: QuestionReportStatus.IN_REVIEW,
      });
      expect(await validate(inReviewDto)).toHaveLength(0);
    });

    it('should require trimmed resolutionNote (10..1000 chars) when status is RESOLVED or REJECTED (PMR 031)', async () => {
      const whitespaceNote = plainToInstance(ResolveQuestionReportDto, {
        status: QuestionReportStatus.RESOLVED,
        resolutionNote: '            ',
      });
      expect((await validate(whitespaceNote)).map((e) => e.property)).toContain('resolutionNote');

      const validDto = plainToInstance(ResolveQuestionReportDto, {
        status: QuestionReportStatus.REJECTED,
        resolutionNote: '  Đáp án B là chính xác theo ngữ pháp thì quá khứ đơn.  ',
        resolveAllForQuestion: true,
      });
      const errors = await validate(validDto);
      expect(errors).toHaveLength(0);
      expect(validDto.resolutionNote).toBe('Đáp án B là chính xác theo ngữ pháp thì quá khứ đơn.');
      expect(validDto.resolveAllForQuestion).toBe(true);
    });
  });

  describe('QueryMyQuestionReportsDto & QueryQuestionReportsDto', () => {
    it('should default page=1 and limit=10 and reject limit > 50 or invalid questionId', async () => {
      const myDto = plainToInstance(QueryMyQuestionReportsDto, {});
      expect(await validate(myDto)).toHaveLength(0);
      expect(myDto.page).toBe(1);
      expect(myDto.limit).toBe(10);

      const adminDto = plainToInstance(QueryQuestionReportsDto, {
        page: 0,
        limit: 51,
        questionId: 'not-a-uuid',
      });
      const errors = await validate(adminDto);
      expect(errors.map((e) => e.property)).toEqual(
        expect.arrayContaining(['page', 'limit', 'questionId']),
      );
    });
  });
});
