import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ChangeExamStatusDto } from './request/change-exam-status.dto';
import { ExamPublishResultResponseDto } from './response/exam-publish-result-response.dto';
import { ExamStatus } from '../enums/exam-status.enum';

describe('ExamsPublishingDtoSpec', () => {
  describe('ChangeExamStatusDto', () => {
    it('should validate successfully with valid integer version >= 1', async () => {
      const dto = plainToInstance(ChangeExamStatusDto, { version: 1 });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail validation when version is missing', async () => {
      const dto = plainToInstance(ChangeExamStatusDto, {});
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('version');
    });

    it('should fail validation when version is <= 0', async () => {
      const dto = plainToInstance(ChangeExamStatusDto, { version: 0 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('version');
    });

    it('should fail validation when version is not an integer', async () => {
      const dto = plainToInstance(ChangeExamStatusDto, { version: 1.5 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('version');
    });
  });

  describe('ExamPublishResultResponseDto', () => {
    it('should correctly expose result fields and handle isScheduled calculation', () => {
      const response = new ExamPublishResultResponseDto();
      response.id = '11111111-1111-4111-8111-111111111111';
      response.title = 'TOEIC Practice Test';
      response.status = ExamStatus.PUBLISHED;
      response.version = 2;
      response.isScheduled = true;
      response.openAt = new Date('2099-01-01');
      response.closeAt = new Date('2099-01-02');
      response.publishedAt = new Date();
      response.updatedAt = new Date();

      expect(response.id).toBeDefined();
      expect(response.isScheduled).toBe(true);
      expect(response.status).toBe(ExamStatus.PUBLISHED);
      expect(response.version).toBe(2);
    });
  });
});
