/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { getQueueToken } from '@nestjs/bullmq';
import { QuestionsImportService } from './questions-import.service';
import { ExcelParserService } from './excel-parser.service';
import { ZipExtractorService } from './zip-extractor.service';
import { STORAGE_SERVICE } from '../../storage/storage.constants';
import { ImportJob } from '../entities/import-job.entity';
import { Question } from '../entities/question.entity';
import { QuestionGroup } from '../../question-groups/entities/question-group.entity';
import { QuestionOption } from '../entities/question-option.entity';
import { MediaResource } from '../entities/media-resource.entity';
import { ToeicPart } from '../entities/toeic-part.entity';
import { Topic } from '../entities/topic.entity';
import { Skill } from '../entities/skill.entity';
import { ImportJobStatus } from '../enums/import-job-status.enum';
import { QuestionStatus } from '../enums/question-status.enum';
import { IMPORT_LIMITS } from '../../../config/import.config';

describe('QuestionsImportService', () => {
  let service: QuestionsImportService;
  let excelParserService: jest.Mocked<ExcelParserService>;
  let zipExtractorService: jest.Mocked<ZipExtractorService>;
  let storageService: any;
  let importQueue: any;
  let importJobRepo: any;
  let questionRepo: any;
  let questionGroupRepo: any;
  let dataSource: any;
  let queryRunner: any;

  beforeEach(async () => {
    queryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        save: jest
          .fn()
          .mockImplementation((entity) => Promise.resolve({ id: 'saved-id', ...entity })),
        findOne: jest.fn(),
        find: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockImplementation((_, data) => data),
        update: jest.fn(),
      },
    };

    dataSource = {
      createQueryRunner: jest.fn().mockReturnValue(queryRunner),
    };

    importJobRepo = {
      create: jest.fn().mockImplementation((dto) => ({ id: 'job-uuid-1', ...dto })),
      save: jest.fn().mockImplementation((job) => Promise.resolve({ id: 'job-uuid-1', ...job })),
      findOne: jest.fn().mockImplementation(({ where }) =>
        Promise.resolve({
          id: where?.id || 'job-uuid-1',
          status: ImportJobStatus.PENDING,
          fileName: 'test.xlsx',
          fileType: 'excel',
          createdBy: 'user-uuid-1',
        }),
      ),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
    };

    questionRepo = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
    };

    questionGroupRepo = {
      findOne: jest.fn(),
    };

    excelParserService = {
      countTotalDataRows: jest.fn(),
      parseQuestionsExcel: jest.fn(),
    } as any;

    zipExtractorService = {
      extractZipPackage: jest.fn(),
    } as any;

    storageService = {
      uploadFile: jest.fn().mockResolvedValue({
        url: 'https://storage.local/import-files/user1/test.xlsx',
        storageKey: 'import-files/user1/test.xlsx',
      }),
      downloadFile: jest.fn().mockResolvedValue(Buffer.from('excel-data')),
    };

    importQueue = {
      add: jest.fn().mockResolvedValue({ id: 'bullmq-job-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuestionsImportService,
        { provide: DataSource, useValue: dataSource },
        { provide: getRepositoryToken(ImportJob), useValue: importJobRepo },
        { provide: getRepositoryToken(Question), useValue: questionRepo },
        { provide: getRepositoryToken(QuestionGroup), useValue: questionGroupRepo },
        { provide: getRepositoryToken(QuestionOption), useValue: {} },
        { provide: getRepositoryToken(MediaResource), useValue: {} },
        {
          provide: getRepositoryToken(ToeicPart),
          useValue: {
            find: jest.fn().mockResolvedValue([
              { id: 'p3-id', partNumber: 3 },
              { id: 'p5-id', partNumber: 5 },
            ]),
          },
        },
        { provide: getRepositoryToken(Topic), useValue: { find: jest.fn().mockResolvedValue([]) } },
        { provide: getRepositoryToken(Skill), useValue: { find: jest.fn().mockResolvedValue([]) } },
        { provide: ExcelParserService, useValue: excelParserService },
        { provide: ZipExtractorService, useValue: zipExtractorService },
        { provide: STORAGE_SERVICE, useValue: storageService },
        { provide: getQueueToken(IMPORT_LIMITS.QUEUE_NAME), useValue: importQueue },
      ],
    }).compile();

    service = module.get<QuestionsImportService>(QuestionsImportService);
  });

  describe('Sync vs Async threshold routing (Review Focus 4)', () => {
    it('should process synchronously when total rows < 100', async () => {
      excelParserService.countTotalDataRows.mockResolvedValue(50);
      excelParserService.parseQuestionsExcel.mockResolvedValue({
        standaloneQuestions: [],
        groupedQuestions: new Map(),
        totalRows: 50,
        errors: [],
      });

      const mockFile = {
        originalname: 'questions.xlsx',
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer: Buffer.from('mock-excel-buffer'),
        size: 1024,
      } as Express.Multer.File;

      const result = await service.processUploadedFile(
        mockFile,
        QuestionStatus.DRAFT,
        'user-uuid-1',
      );

      expect(result.isAsync).toBe(false);
      expect(result.status).toBe(ImportJobStatus.COMPLETED);
      expect(importQueue.add).not.toHaveBeenCalled();
      expect(storageService.uploadFile).toHaveBeenCalled();
    });

    it('should enqueue BullMQ job with metadata and storageKey only when total rows >= 100', async () => {
      excelParserService.countTotalDataRows.mockResolvedValue(150);

      const mockFile = {
        originalname: 'questions.xlsx',
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer: Buffer.from('mock-excel-buffer'),
        size: 1024,
      } as Express.Multer.File;

      const result = await service.processUploadedFile(
        mockFile,
        QuestionStatus.DRAFT,
        'user-uuid-1',
      );

      expect(result.isAsync).toBe(true);
      expect(result.status).toBe(ImportJobStatus.PROCESSING);
      expect(importQueue.add).toHaveBeenCalledWith(
        IMPORT_LIMITS.JOB_NAME,
        expect.objectContaining({
          jobId: 'job-uuid-1',
          storageKey: 'import-files/user1/test.xlsx',
          fileType: 'excel',
          targetStatus: QuestionStatus.DRAFT,
          userId: 'user-uuid-1',
        }),
      );
      // Ensure no raw binary buffer in BullMQ payload
      const payload = importQueue.add.mock.calls[0][1];
      expect(payload.buffer).toBeUndefined();
    });
  });

  describe('Group Atomicity and Rollback (Review Focus 2)', () => {
    it('should rollback entire group transaction if one question in group fails', async () => {
      const groupedQuestions = new Map();
      groupedQuestions.set('GRP_01', [
        {
          rowNumber: 2,
          partNumber: 3,
          questionText: 'Q1',
          optionA: 'A',
          optionB: 'B',
          optionC: 'C',
          optionD: 'D',
          correctAnswer: 'A',
          groupId: 'GRP_01',
        },
        {
          rowNumber: 3,
          partNumber: 99, // INVALID PART causing error
          questionText: 'Q2',
          optionA: 'A',
          optionB: 'B',
          optionC: 'C',
          optionD: 'D',
          correctAnswer: 'B',
          groupId: 'GRP_01',
        },
      ]);

      excelParserService.parseQuestionsExcel.mockResolvedValue({
        standaloneQuestions: [],
        groupedQuestions,
        totalRows: 2,
        errors: [],
      });

      const result = await service.processImportSync('job-uuid-1', {
        excelBuffer: Buffer.from('mock'),
        mediaFilesMap: new Map(),
        targetStatus: QuestionStatus.DRAFT,
        userId: 'user-uuid-1',
      });

      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(result.errorCount).toBe(2);
      expect(result.successCount).toBe(0);
      expect(result.createdGroupsCount).toBe(0);
      expect(result.errorDetails?.length).toBe(2);
    });
  });

  describe('Media Replacement Whitelist Status Check (Review Focus 3)', () => {
    it('should reject media replacement if target question is published or pending_review', async () => {
      const standaloneQuestions = [
        {
          rowNumber: 2,
          partNumber: 5,
          questionText: 'Q1',
          optionA: 'A',
          optionB: 'B',
          optionC: 'C',
          optionD: 'D',
          correctAnswer: 'A',
          mediaRef: 'audio/audio1.mp3',
        },
      ];

      excelParserService.parseQuestionsExcel.mockResolvedValue({
        standaloneQuestions,
        groupedQuestions: new Map(),
        totalRows: 1,
        errors: [],
      });

      // Target question exists in published status
      queryRunner.manager.findOne.mockResolvedValueOnce({
        id: 'q-published',
        status: QuestionStatus.PUBLISHED,
      });

      const mediaMap = new Map();
      mediaMap.set('audio/audio1.mp3', {
        buffer: Buffer.from('audio-content'),
        mimeType: 'audio/mpeg',
        size: 100,
      });

      // Mock finding existing question by content or finding media replacement target
      jest.spyOn(service as any, 'findMediaReplacementTarget').mockResolvedValue({
        targetType: 'question',
        targetId: 'q-published',
        status: QuestionStatus.PUBLISHED,
      });

      const result = await service.processImportSync('job-uuid-1', {
        excelBuffer: Buffer.from('mock'),
        mediaFilesMap: mediaMap,
        targetStatus: QuestionStatus.DRAFT,
        userId: 'user-uuid-1',
      });

      expect(result.errorCount).toBe(1);
      expect(result.errorDetails?.[0].code).toBe('CANNOT_REPLACE_MEDIA_ON_PUBLISHED_CONTENT');
    });
  });
});
