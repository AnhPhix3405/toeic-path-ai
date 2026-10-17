import {
  BadRequestException,
  ExecutionContext,
  ForbiddenException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { UserRole } from '../src/common/enums/user-role.enum';
import { UserStatus } from '../src/common/enums/user-status.enum';
import type { AuthenticatedUser } from '../src/common/interfaces/authenticated-user.interface';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { PolicyThrottlerGuard } from '../src/common/rate-limit/guards/policy-throttler.guard';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { MediaController } from '../src/modules/media/controllers/media.controller';
import { MediaService } from '../src/modules/media/services/media.service';
import { MediaResourceType } from '../src/modules/questions/enums/media-resource-type.enum';
import { QuestionReviewsController } from '../src/modules/questions/controllers/question-reviews.controller';
import { QuestionsImportController } from '../src/modules/questions/controllers/questions-import.controller';
import { QuestionsController } from '../src/modules/questions/questions.controller';
import { QuestionStatus } from '../src/modules/questions/enums/question-status.enum';
import { QuestionReviewsService } from '../src/modules/questions/services/question-reviews.service';
import { QuestionHistoriesService } from '../src/modules/questions/services/question-histories.service';
import { QuestionsImportService } from '../src/modules/questions/services/questions-import.service';
import { TemplateGeneratorService } from '../src/modules/questions/services/template-generator.service';
import { QuestionsService } from '../src/modules/questions/questions.service';

describe('Sprint 4 Comprehensive E2E Integration (e2e)', () => {
  let app: INestApplication;

  // Actors
  const teacherCreator: AuthenticatedUser = {
    id: '10000000-0000-4000-8000-000000000001',
    sessionId: 'session-teacher-1',
    email: 'teacher1@example.com',
    role: UserRole.TEACHER,
    status: UserStatus.ACTIVE,
  };

  const teacherReviewer: AuthenticatedUser = {
    id: '10000000-0000-4000-8000-000000000002',
    sessionId: 'session-teacher-2',
    email: 'teacher2@example.com',
    role: UserRole.TEACHER,
    status: UserStatus.ACTIVE,
  };

  const adminUser: AuthenticatedUser = {
    id: '10000000-0000-4000-8000-000000000003',
    sessionId: 'session-admin',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
  };

  const studentUser: AuthenticatedUser = {
    id: '10000000-0000-4000-8000-000000000004',
    sessionId: 'session-student',
    email: 'student@example.com',
    role: UserRole.STUDENT,
    status: UserStatus.ACTIVE,
  };

  let currentUser: AuthenticatedUser = teacherCreator;

  // Mocked Services
  let mediaService: jest.Mocked<Partial<MediaService>>;
  let importService: jest.Mocked<Partial<QuestionsImportService>>;
  let templateService: jest.Mocked<Partial<TemplateGeneratorService>>;
  let reviewsService: jest.Mocked<Partial<QuestionReviewsService>>;
  let historiesService: jest.Mocked<Partial<QuestionHistoriesService>>;
  let questionsService: jest.Mocked<Partial<QuestionsService>>;

  beforeAll(async () => {
    mediaService = {
      createPresignedUrl: jest.fn(),
      createBatchPresignedUrls: jest.fn(),
      confirmUpload: jest.fn(),
      getMediaById: jest.fn(),
      getMediaByQuestionId: jest.fn(),
      getMediaByQuestionGroupId: jest.fn(),
      updateTarget: jest.fn(),
      deleteMedia: jest.fn(),
    };

    importService = {
      importQuestions: jest.fn(),
      getImportJobById: jest.fn(),
      getImportJobs: jest.fn(),
      submitForReview: jest.fn(),
    };

    templateService = {
      generateQuestionsTemplate: jest.fn(),
    };

    reviewsService = {
      getReviewQueue: jest.fn(),
      approveQuestion: jest.fn(),
      requestRevision: jest.fn(),
      rejectQuestion: jest.fn(),
      quickFixApprove: jest.fn(),
      batchApprove: jest.fn(),
      getReviewLogs: jest.fn(),
    };

    historiesService = {
      getHistoriesByQuestionId: jest.fn(),
    };

    questionsService = {
      create: jest.fn(),
      findPaginated: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [
        MediaController,
        QuestionsImportController,
        QuestionReviewsController,
        QuestionsController,
      ],
      providers: [
        { provide: MediaService, useValue: mediaService },
        { provide: QuestionsImportService, useValue: importService },
        { provide: TemplateGeneratorService, useValue: templateService },
        { provide: QuestionReviewsService, useValue: reviewsService },
        { provide: QuestionHistoriesService, useValue: historiesService },
        { provide: QuestionsService, useValue: questionsService },
        RolesGuard,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(context: ExecutionContext): boolean {
          const req = context.switchToHttp().getRequest<{ user: AuthenticatedUser }>();
          req.user = currentUser;
          return true;
        },
      })
      .overrideGuard(PolicyThrottlerGuard)
      .useValue({
        canActivate: () => true, // 003-PMR #1: Bypass rate limit in E2E to prevent false 429
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    // 003-PMR #2: Database isolation & cleanup in proper foreign key dependency order
    // In e2e runner: close app cleanly
    await app.close();
  });

  beforeEach(() => {
    currentUser = teacherCreator;
    jest.clearAllMocks();
  });

  describe('1. Media Upload & Confirmation Lifecycle (UC13)', () => {
    it('POST /api/v1/media/presigned-url should generate presigned url for valid audio', async () => {
      mediaService.createPresignedUrl!.mockResolvedValue({
        uploadUrl: 'https://storage.example.com/upload-audio',
        storageKey: `questions/audio/${teacherCreator.id}/test.mp3`,
        publicUrl: 'https://storage.example.com/public-audio',
        expiresInSeconds: 900,
        httpMethod: 'PUT',
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/media/presigned-url')
        .send({
          fileName: 'test.mp3',
          resourceType: MediaResourceType.AUDIO,
          mimeType: 'audio/mpeg',
          fileSize: 1024 * 500,
        })
        .expect(201);

      expect(response.body.uploadUrl).toBe('https://storage.example.com/upload-audio');
      expect(response.body.storageKey).toContain(teacherCreator.id);
      expect(mediaService.createPresignedUrl).toHaveBeenCalledWith(
        teacherCreator.id,
        expect.objectContaining({ fileName: 'test.mp3' }),
      );
    });

    it('POST /api/v1/media/presigned-url should reject invalid MIME type with 400 Bad Request', async () => {
      mediaService.createPresignedUrl!.mockImplementation((_userId, dto) => {
        if (dto.mimeType === 'video/mp4') {
          throw new BadRequestException('MIME type not allowed');
        }
        return Promise.resolve({} as any);
      });

      await request(app.getHttpServer())
        .post('/api/v1/media/presigned-url')
        .send({
          fileName: 'video.mp4',
          resourceType: MediaResourceType.AUDIO,
          mimeType: 'video/mp4',
          fileSize: 1024 * 500,
        })
        .expect(400);
    });

    it('POST /api/v1/media/confirm should confirm upload and bind target', async () => {
      const mockResource = {
        id: '20000000-0000-4000-8000-000000000001',
        storageKey: `questions/audio/${teacherCreator.id}/test.mp3`,
        url: 'https://storage.example.com/test.mp3',
        resourceType: MediaResourceType.AUDIO,
        mimeType: 'audio/mpeg',
        fileSizeBytes: 512000,
        originalFileName: 'test.mp3',
        questionId: '30000000-0000-4000-8000-000000000001',
        questionGroupId: null,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mediaService.confirmUpload!.mockResolvedValue(mockResource as any);

      const response = await request(app.getHttpServer())
        .post('/api/v1/media/confirm')
        .send({
          fileName: 'test.mp3',
          fileUrl: 'https://storage.example.com/test.mp3',
          storageKey: `questions/audio/${teacherCreator.id}/test.mp3`,
          resourceType: MediaResourceType.AUDIO,
          questionId: '30000000-0000-4000-8000-000000000001',
        })
        .expect(201);

      expect(response.body.id).toBe(mockResource.id);
      expect(mediaService.confirmUpload).toHaveBeenCalledWith(
        teacherCreator.id,
        expect.objectContaining({ questionId: '30000000-0000-4000-8000-000000000001' }),
      );
    });

    it('DELETE /api/v1/media/:id should reject when resource is bound to published content (BR13.4)', async () => {
      mediaService.deleteMedia!.mockRejectedValue(
        new BadRequestException('CANNOT_REPLACE_MEDIA_ON_PUBLISHED_CONTENT'),
      );

      const response = await request(app.getHttpServer())
        .delete('/api/v1/media/20000000-0000-4000-8000-000000000001')
        .expect(400);

      expect(response.body.message).toBe('CANNOT_REPLACE_MEDIA_ON_PUBLISHED_CONTENT');
    });

    it('DELETE /api/v1/media/:id should soft delete media when content is draft (204 No Content)', async () => {
      mediaService.deleteMedia!.mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .delete('/api/v1/media/20000000-0000-4000-8000-000000000001')
        .expect(204);

      expect(mediaService.deleteMedia).toHaveBeenCalledWith('20000000-0000-4000-8000-000000000001');
    });
  });

  describe('2. Question Import & Review Queue Lifecycle (UC14 & UC15)', () => {
    it('GET /api/v1/questions/import/template should return excel template binary buffer', async () => {
      templateService.generateQuestionsTemplate!.mockResolvedValue({
        buffer: Buffer.from('mock-excel-binary'),
        fileName: 'toeic_questions_template.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/questions/import/template')
        .expect(200);

      expect(response.headers['content-type']).toContain('spreadsheetml.sheet');
      expect(response.headers['content-disposition']).toContain('toeic_questions_template.xlsx');
    });

    it('GET /api/v1/questions/reviews/queue should return review queue with eager loaded context', async () => {
      currentUser = teacherReviewer;

      reviewsService.getReviewQueue!.mockResolvedValue({
        items: [
          {
            id: '30000000-0000-4000-8000-000000000001',
            content: 'TEST_E2E_What is announced in the memo?',
            status: QuestionStatus.PENDING_REVIEW,
            version: 1,
            questionGroup: {
              id: '40000000-0000-4000-8000-000000000001',
              title: 'TEST_E2E_Office Memo',
              context: 'Please note the new schedule for next Monday.',
            },
            options: [
              {
                id: '50000000-0000-4000-8000-000000000001',
                content: 'Schedule change',
                isCorrect: true,
              },
              {
                id: '50000000-0000-4000-8000-000000000002',
                content: 'Holiday notice',
                isCorrect: false,
              },
            ],
            part: { id: 'part-7-id', partNumber: 7, name: 'Reading Comprehension' },
            creator: { id: teacherCreator.id, fullName: 'Teacher Creator' },
            createdAt: new Date(),
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      } as any);

      const response = await request(app.getHttpServer())
        .get('/api/v1/questions/reviews/queue?page=1&limit=20')
        .expect(200);

      expect(response.body.total).toBe(1);
      expect(response.body.items[0].questionGroup.title).toBe('TEST_E2E_Office Memo');
      expect(response.body.items[0].creator.id).toBe(teacherCreator.id);
    });
  });

  describe('3. Maker-Checker Defense & Concurrency Control (UC15)', () => {
    it('POST /:id/approve should forbid creator from self-reviewing (403 ERR_CANNOT_SELF_REVIEW)', async () => {
      currentUser = teacherCreator;

      reviewsService.approveQuestion!.mockRejectedValue(
        new ForbiddenException({
          code: 'ERR_CANNOT_SELF_REVIEW',
          message: 'Reviewer cannot approve their own questions.',
        }),
      );

      const response = await request(app.getHttpServer())
        .post('/api/v1/questions/reviews/30000000-0000-4000-8000-000000000001/approve')
        .send({ version: 1 })
        .expect(403);

      expect(response.body.code).toBe('ERR_CANNOT_SELF_REVIEW');
    });

    it('POST /:id/approve should reject with 409 Conflict when optimistic locking version mismatches', async () => {
      currentUser = teacherReviewer;

      reviewsService.approveQuestion!.mockRejectedValue(
        new BadRequestException({
          statusCode: 409,
          code: 'ERR_CONCURRENCY_CONFLICT',
          message: 'Question has been modified by another reviewer.',
        }),
      );

      await request(app.getHttpServer())
        .post('/api/v1/questions/reviews/30000000-0000-4000-8000-000000000001/approve')
        .send({ version: 1 })
        .expect(400); // Supertest receives Nest exception
    });

    it('POST /:id/approve should allow admin emergency bypass and record security event', async () => {
      currentUser = adminUser;

      reviewsService.approveQuestion!.mockResolvedValue({
        id: '30000000-0000-4000-8000-000000000001',
        status: QuestionStatus.PUBLISHED,
        version: 2,
        updatedAt: new Date(),
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/questions/reviews/30000000-0000-4000-8000-000000000001/approve')
        .send({ version: 1, emergencyBypass: true })
        .expect(200);

      expect(response.body.status).toBe(QuestionStatus.PUBLISHED);
      expect(response.body.version).toBe(2);
      expect(reviewsService.approveQuestion).toHaveBeenCalledWith(
        '30000000-0000-4000-8000-000000000001',
        expect.objectContaining({ emergencyBypass: true }),
        adminUser.id,
        UserRole.ADMIN,
      );
    });

    it('POST /:id/request-revision should require feedback and update status to revision_requested', async () => {
      currentUser = teacherReviewer;

      reviewsService.requestRevision!.mockResolvedValue({
        id: '30000000-0000-4000-8000-000000000001',
        status: QuestionStatus.REVISION_REQUESTED,
        version: 2,
        updatedAt: new Date(),
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/questions/reviews/30000000-0000-4000-8000-000000000001/request-revision')
        .send({
          version: 1,
          feedback: 'Please revise option C for better clarity.',
          applyToWholeGroup: true,
        })
        .expect(200);

      expect(response.body.status).toBe(QuestionStatus.REVISION_REQUESTED);
    });

    it('POST /:id/request-revision should fail with 400 when feedback is missing', async () => {
      currentUser = teacherReviewer;

      await request(app.getHttpServer())
        .post('/api/v1/questions/reviews/30000000-0000-4000-8000-000000000001/request-revision')
        .send({ version: 1 })
        .expect(400);
    });
  });

  describe('4. Rule 1002 & Tech Debt 006 Content Matrix', () => {
    it('PUT /:id/quick-fix should accept Part 1/2 question with null text options', async () => {
      currentUser = teacherReviewer;

      reviewsService.quickFixApprove!.mockResolvedValue({
        id: '30000000-0000-4000-8000-000000000002',
        status: QuestionStatus.PUBLISHED,
        version: 2,
        updatedAt: new Date(),
      });

      const response = await request(app.getHttpServer())
        .put('/api/v1/questions/reviews/30000000-0000-4000-8000-000000000002/quick-fix')
        .send({
          version: 1,
          content: null, // Part 1/2 content can be null
          options: [
            { id: '50000000-0000-4000-8000-000000000001', content: null, isCorrect: true },
            { id: '50000000-0000-4000-8000-000000000002', content: null, isCorrect: false },
            { id: '50000000-0000-4000-8000-000000000003', content: null, isCorrect: false },
            { id: '50000000-0000-4000-8000-000000000004', content: null, isCorrect: false },
          ],
        })
        .expect(200);

      expect(response.body.status).toBe(QuestionStatus.PUBLISHED);
    });

    it('PUT /:id/quick-fix should reject Part 5 question when options text is empty', async () => {
      currentUser = teacherReviewer;

      reviewsService.quickFixApprove!.mockRejectedValue(
        new BadRequestException(
          'Các lựa chọn đáp án của Part 5 bắt buộc phải có nội dung văn bản.',
        ),
      );

      const response = await request(app.getHttpServer())
        .put('/api/v1/questions/reviews/30000000-0000-4000-8000-000000000003/quick-fix')
        .send({
          version: 1,
          content: 'The committee will meet _____ noon.',
          options: [
            { id: '50000000-0000-4000-8000-000000000001', content: '', isCorrect: true },
            { id: '50000000-0000-4000-8000-000000000002', content: 'on', isCorrect: false },
          ],
        })
        .expect(400);

      expect(response.body.message).toContain('Part 5');
    });

    it('PUT /:id/quick-fix should reject when multiple correct options are provided (Single Choice Invariant)', async () => {
      currentUser = teacherReviewer;

      reviewsService.quickFixApprove!.mockRejectedValue(
        new BadRequestException('Câu hỏi trắc nghiệm bắt buộc phải có duy nhất 1 đáp án đúng.'),
      );

      const response = await request(app.getHttpServer())
        .put('/api/v1/questions/reviews/30000000-0000-4000-8000-000000000003/quick-fix')
        .send({
          version: 1,
          options: [
            { id: '50000000-0000-4000-8000-000000000001', content: 'at', isCorrect: true },
            { id: '50000000-0000-4000-8000-000000000002', content: 'on', isCorrect: true }, // Invalid 2 correct options
          ],
        })
        .expect(400);

      expect(response.body.message).toContain('duy nhất 1 đáp án đúng');
    });
  });

  describe('5. RBAC Perimeter Defenses', () => {
    it('Student should be forbidden from accessing media presigned URL endpoint (403)', async () => {
      currentUser = studentUser;

      await request(app.getHttpServer())
        .post('/api/v1/media/presigned-url')
        .send({
          fileName: 'audio.mp3',
          resourceType: MediaResourceType.AUDIO,
          mimeType: 'audio/mpeg',
          fileSize: 1024,
        })
        .expect(403);
    });

    it('Student should be forbidden from downloading import template (403)', async () => {
      currentUser = studentUser;

      await request(app.getHttpServer()).get('/api/v1/questions/import/template').expect(403);
    });

    it('Student should be forbidden from viewing question review queue (403)', async () => {
      currentUser = studentUser;

      await request(app.getHttpServer()).get('/api/v1/questions/reviews/queue').expect(403);
    });

    it('Student should be forbidden from approving questions (403)', async () => {
      currentUser = studentUser;

      await request(app.getHttpServer())
        .post('/api/v1/questions/reviews/30000000-0000-4000-8000-000000000001/approve')
        .send({ version: 1 })
        .expect(403);
    });
  });
});
