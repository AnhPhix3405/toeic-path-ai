import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { QuestionsImportController } from './questions-import.controller';
import { QuestionsImportService } from '../services/questions-import.service';
import { TemplateGeneratorService } from '../services/template-generator.service';
import { UserRole } from '../../../common/enums/user-role.enum';
import { QuestionStatus } from '../enums/question-status.enum';
import { ImportJobStatus } from '../enums/import-job-status.enum';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PolicyThrottlerGuard } from '../../../common/rate-limit/guards/policy-throttler.guard';

describe('QuestionsImportController', () => {
  let controller: QuestionsImportController;
  let importService: jest.Mocked<QuestionsImportService>;
  let templateService: jest.Mocked<TemplateGeneratorService>;

  beforeEach(async () => {
    importService = {
      processUploadedFile: jest.fn(),
      getImportJobById: jest.fn(),
      getImportJobs: jest.fn(),
      submitForReview: jest.fn(),
    } as any;

    templateService = {
      generateQuestionsTemplate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuestionsImportController],
      providers: [
        { provide: QuestionsImportService, useValue: importService },
        { provide: TemplateGeneratorService, useValue: templateService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PolicyThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<QuestionsImportController>(QuestionsImportController);
  });

  describe('GET /template', () => {
    it('should stream excel template buffer with correct headers', async () => {
      const mockBuffer = Buffer.from('mock-template-data');
      templateService.generateQuestionsTemplate.mockResolvedValue({
        buffer: mockBuffer,
        fileName: 'toeic_questions_template.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const res = {
        setHeader: jest.fn(),
        send: jest.fn(),
      } as any;

      await controller.downloadTemplate(res);

      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="toeic_questions_template.xlsx"',
      );
      expect(res.send).toHaveBeenCalledWith(mockBuffer);
    });
  });

  describe('POST /import (Sync vs Async threshold)', () => {
    it('should return 201 Created when isAsync is false (< 100 rows)', async () => {
      const mockResult = {
        jobId: 'job-1',
        isAsync: false,
        status: ImportJobStatus.COMPLETED,
        totalRows: 50,
        successCount: 50,
        errorCount: 0,
        createdGroupsCount: 5,
      };
      importService.processUploadedFile.mockResolvedValue(mockResult);

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;

      const mockFile = { originalname: 'test.xlsx' } as any;
      const user = { id: 'u1', role: UserRole.TEACHER };

      await controller.importQuestions(mockFile, {}, user, res);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.CREATED);
      expect(res.json).toHaveBeenCalledWith(mockResult);
    });

    it('should return 202 Accepted when isAsync is true (>= 100 rows)', async () => {
      const mockResult = {
        jobId: 'job-2',
        isAsync: true,
        status: ImportJobStatus.PROCESSING,
        totalRows: 150,
        message: 'Tệp lớn đã được tiếp nhận',
      };
      importService.processUploadedFile.mockResolvedValue(mockResult);

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;

      const mockFile = { originalname: 'test.xlsx' } as any;
      const user = { id: 'u1', role: UserRole.TEACHER };

      await controller.importQuestions(mockFile, {}, user, res);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.ACCEPTED);
      expect(res.json).toHaveBeenCalledWith(mockResult);
    });
  });

  describe('GET /jobs/:id and GET /jobs', () => {
    it('should fetch single job by ID', async () => {
      const mockJob = { id: 'job-1', createdBy: 'u1' } as any;
      importService.getImportJobById.mockResolvedValue(mockJob);

      const result = await controller.getImportJob('job-1', {
        id: 'u1',
        role: UserRole.TEACHER,
      });

      expect(result).toBe(mockJob);
      expect(importService.getImportJobById).toHaveBeenCalledWith('job-1', 'u1', false);
    });

    it('should fetch paginated jobs list', async () => {
      const mockJob = {
        id: 'job-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: null,
      } as any;
      importService.getImportJobs.mockResolvedValue({
        items: [mockJob],
        total: 1,
      });

      const result = await controller.getImportJobs(
        { page: 1, limit: 10 },
        { id: 'u1', role: UserRole.TEACHER },
      );

      expect(result.items.length).toBe(1);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
    });
  });

  describe('POST /submit-for-review (Review Focus 5)', () => {
    it('should submit questions and return response with group atomicity stats', async () => {
      const mockResponse = {
        submittedCount: 3,
        submittedIds: ['q1', 'q2', 'q3'],
        skipped: [],
      };
      importService.submitForReview.mockResolvedValue(mockResponse);

      const result = await controller.submitForReview(
        { questionIds: ['q1'] },
        { id: 'u1', role: UserRole.TEACHER },
      );

      expect(result.submittedCount).toBe(3);
      expect(result.submittedIds).toEqual(['q1', 'q2', 'q3']);
      expect(importService.submitForReview).toHaveBeenCalledWith(['q1'], 'u1', false);
    });
  });
});
