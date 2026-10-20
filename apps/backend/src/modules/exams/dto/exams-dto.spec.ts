import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateExamDto } from './request/create-exam.dto';
import { UpdateExamDto } from './request/update-exam.dto';
import { ExamType } from '../enums/exam-type.enum';
import { ScoreConversionType } from '../enums/score-conversion-type.enum';

describe('Exams DTO Validation', () => {
  describe('CreateExamDto', () => {
    it('should fail validation when title is too short or duration is invalid', async () => {
      const dto = plainToInstance(CreateExamDto, {
        title: 'ETS',
        type: ExamType.FULL_TEST,
        durationMinutes: 0,
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const titleError = errors.find((e) => e.property === 'title');
      const durationError = errors.find((e) => e.property === 'durationMinutes');
      expect(titleError).toBeDefined();
      expect(durationError).toBeDefined();
    });

    it('should pass validation when CreateExamDto has valid fields', async () => {
      const dto = plainToInstance(CreateExamDto, {
        title: 'ETS TOEIC 2026 Test 01',
        description: 'Đề thi thử TOEIC chuẩn format 2026',
        type: ExamType.FULL_TEST,
        durationMinutes: 120,
        passingScore: 600,
        maxAttempts: 3,
        allowPartPractice: true,
        isShuffledQuestions: false,
        isShuffledOptions: false,
        scoreConversionType: ScoreConversionType.DEFAULT_ETS,
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should transform numeric string inputs to numbers using @Type(() => Number)', async () => {
      const dto = plainToInstance(CreateExamDto, {
        title: 'ETS TOEIC 2026 Test 02',
        type: ExamType.MINI_TEST,
        durationMinutes: '60',
        maxAttempts: '2',
        passingScore: '450',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(typeof dto.durationMinutes).toBe('number');
      expect(dto.durationMinutes).toBe(60);
      expect(typeof dto.maxAttempts).toBe('number');
      expect(dto.maxAttempts).toBe(2);
      expect(typeof dto.passingScore).toBe('number');
      expect(dto.passingScore).toBe(450);
    });
  });

  describe('UpdateExamDto', () => {
    it('should require version on UpdateExamDto', async () => {
      const dto = plainToInstance(UpdateExamDto, {
        title: 'Updated Test Title',
      });
      const errors = await validate(dto);
      const versionError = errors.find((e) => e.property === 'version');
      expect(versionError).toBeDefined();
    });

    it('should fail if version is less than 1', async () => {
      const dto = plainToInstance(UpdateExamDto, {
        title: 'Updated Test Title',
        version: 0,
      });
      const errors = await validate(dto);
      const versionError = errors.find((e) => e.property === 'version');
      expect(versionError).toBeDefined();
    });

    it('should pass when version is valid positive integer', async () => {
      const dto = plainToInstance(UpdateExamDto, {
        title: 'Updated Test Title',
        version: '1',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(dto.version).toBe(1);
    });
  });
});
