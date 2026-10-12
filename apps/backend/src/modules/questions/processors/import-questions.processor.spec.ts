/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bullmq';
import { ImportQuestionsJobData, ImportQuestionsProcessor } from './import-questions.processor';
import { QuestionsImportService } from '../services/questions-import.service';
import { QuestionStatus } from '../enums/question-status.enum';

describe('ImportQuestionsProcessor', () => {
  let processor: ImportQuestionsProcessor;
  let questionsImportService: { processImportAsync: jest.Mock };

  beforeEach(async () => {
    questionsImportService = {
      processImportAsync: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImportQuestionsProcessor,
        {
          provide: QuestionsImportService,
          useValue: questionsImportService,
        },
      ],
    }).compile();

    processor = module.get<ImportQuestionsProcessor>(ImportQuestionsProcessor);
  });

  it('should process job by delegating to questionsImportService.processImportAsync', async () => {
    const mockJob = {
      data: {
        jobId: 'job-123',
        storageKey: 'import-files/u1/file.xlsx',
        fileType: 'excel',
        targetStatus: QuestionStatus.DRAFT,
        userId: 'u1',
      },
    } as Job<ImportQuestionsJobData>;

    await processor.process(mockJob);

    expect(questionsImportService.processImportAsync).toHaveBeenCalledWith(
      'job-123',
      'import-files/u1/file.xlsx',
      'excel',
      QuestionStatus.DRAFT,
      'u1',
    );
  });
});
