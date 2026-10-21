import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ConfigureExamSectionsDto } from './request/configure-exam-sections.dto';
import { AddExamQuestionsDto } from './request/add-exam-questions.dto';
import { ReorderExamQuestionsDto } from './request/reorder-exam-questions.dto';
import { AutoGenerateExamDto } from './request/auto-generate-exam.dto';

describe('Exams Structure DTO Validation', () => {
  describe('ConfigureExamSectionsDto', () => {
    it('should fail when version is invalid or sections is empty/invalid', async () => {
      const invalidDto = plainToInstance(ConfigureExamSectionsDto, {
        version: 0,
        sections: [{ partNumber: 8, targetQuestionsCount: 0 }],
      });
      const errors = await validate(invalidDto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should pass when version and sections are valid', async () => {
      const validDto = plainToInstance(ConfigureExamSectionsDto, {
        version: 1,
        sections: [
          { partNumber: 1, targetQuestionsCount: 6, targetDurationMinutes: 10 },
          { partNumber: 5, targetQuestionsCount: 30 },
        ],
      });
      const errors = await validate(validDto);
      expect(errors.length).toBe(0);
    });
  });

  describe('AddExamQuestionsDto', () => {
    it('should fail when sectionId is not a valid UUID or version is missing', async () => {
      const invalidDto = plainToInstance(AddExamQuestionsDto, {
        version: 0,
        sectionId: 'not-a-uuid',
      });
      const errors = await validate(invalidDto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should pass when version, sectionId, and questionIds/questionGroupIds are valid UUIDs', async () => {
      const validDto = plainToInstance(AddExamQuestionsDto, {
        version: 1,
        sectionId: '10000000-0000-4000-8000-000000000001',
        questionIds: ['20000000-0000-4000-8000-000000000001'],
        questionGroupIds: ['30000000-0000-4000-8000-000000000001'],
      });
      const errors = await validate(validDto);
      expect(errors.length).toBe(0);
    });
  });

  describe('ReorderExamQuestionsDto', () => {
    it('should fail when items is empty or contains invalid orderIndex', async () => {
      const invalidDto = plainToInstance(ReorderExamQuestionsDto, {
        version: 1,
        items: [{ questionId: 'not-uuid', orderIndex: 0 }],
      });
      const errors = await validate(invalidDto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should pass when items contain valid questionId and positive orderIndex', async () => {
      const validDto = plainToInstance(ReorderExamQuestionsDto, {
        version: 1,
        items: [
          { questionId: '20000000-0000-4000-8000-000000000001', orderIndex: 1 },
          { questionId: '20000000-0000-4000-8000-000000000002', orderIndex: 2 },
        ],
      });
      const errors = await validate(validDto);
      expect(errors.length).toBe(0);
    });
  });

  describe('AutoGenerateExamDto', () => {
    it('should fail when version is not a positive integer', async () => {
      const invalidDto = plainToInstance(AutoGenerateExamDto, { version: 0 });
      const errors = await validate(invalidDto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should pass when version is valid and criteria is optional or valid', async () => {
      const validDto = plainToInstance(AutoGenerateExamDto, {
        version: 1,
        criteria: [
          {
            partNumber: 5,
            targetQuestionsCount: 30,
            easyPercentage: 30,
            mediumPercentage: 50,
            hardPercentage: 20,
            topicIds: ['40000000-0000-4000-8000-000000000001'],
          },
        ],
      });
      const errors = await validate(validDto);
      expect(errors.length).toBe(0);
    });
  });
});
