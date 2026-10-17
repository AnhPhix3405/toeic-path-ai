import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { MediaController } from '../../../modules/media/controllers/media.controller';
import { MediaService } from '../../../modules/media/services/media.service';
import { QuestionsImportController } from '../../../modules/questions/controllers/questions-import.controller';
import { QuestionsImportService } from '../../../modules/questions/services/questions-import.service';
import { TemplateGeneratorService } from '../../../modules/questions/services/template-generator.service';
import { QuestionReviewsController } from '../../../modules/questions/controllers/question-reviews.controller';
import { QuestionReviewsService } from '../../../modules/questions/services/question-reviews.service';
import { QuestionHistoriesService } from '../../../modules/questions/services/question-histories.service';
import { QuestionsController } from '../../../modules/questions/questions.controller';
import { QuestionsService } from '../../../modules/questions/questions.service';
import { ClassificationCatalogController } from '../../../modules/questions/classification-catalog.controller';
import { ClassificationCatalogService } from '../../../modules/questions/classification-catalog.service';
import { QuestionGroupsController } from '../../../modules/question-groups/question-groups.controller';
import { QuestionGroupsService } from '../../../modules/question-groups/question-groups.service';
import { RolesGuard } from '../../guards/roles.guard';
import { PolicyThrottlerGuard } from '../../rate-limit/guards/policy-throttler.guard';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';

describe('OpenAPI Swagger Parity & Integrity (Sprint 4)', () => {
  let app: INestApplication;
  let openApiDoc: OpenAPIObject;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [
        MediaController,
        QuestionsImportController,
        QuestionReviewsController,
        QuestionsController,
        ClassificationCatalogController,
        QuestionGroupsController,
      ],
      providers: [
        { provide: MediaService, useValue: {} },
        { provide: QuestionsImportService, useValue: {} },
        { provide: TemplateGeneratorService, useValue: {} },
        { provide: QuestionReviewsService, useValue: {} },
        { provide: QuestionHistoriesService, useValue: {} },
        { provide: QuestionsService, useValue: {} },
        { provide: ClassificationCatalogService, useValue: {} },
        { provide: QuestionGroupsService, useValue: {} },
      ],
    })
      .overrideGuard(PolicyThrottlerGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');

    const config = new DocumentBuilder()
      .setTitle('Toeic Path AI API Documentation')
      .setDescription('Tài liệu API hệ thống học tập Toeic Path AI')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Nhập JWT token',
          in: 'header',
        },
        'JWT-auth',
      )
      .build();

    openApiDoc = SwaggerModule.createDocument(app, config);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('should generate valid OpenAPI 3.0 document with title and version', () => {
    expect(openApiDoc).toBeDefined();
    expect(openApiDoc.info.title).toBe('Toeic Path AI API Documentation');
    expect(openApiDoc.openapi).toMatch(/^3\./);
  });

  it('should register all Sprint 4 API operation tags', () => {
    const operationTags = new Set<string>();
    const methods: Array<'get' | 'post' | 'put' | 'delete' | 'patch'> = [
      'get',
      'post',
      'put',
      'delete',
      'patch',
    ];
    for (const pathKey of Object.keys(openApiDoc.paths)) {
      const pathItem = openApiDoc.paths[pathKey] as Record<string, { tags?: string[] } | undefined>;
      for (const method of methods) {
        const operation = pathItem?.[method];
        if (operation?.tags) {
          for (const tag of operation.tags) {
            operationTags.add(tag);
          }
        }
      }
    }

    const tags = Array.from(operationTags);
    expect(tags).toContain('Media Resources');
    expect(tags).toContain('Questions');
    expect(tags).toContain('Questions Import');
    expect(tags).toContain('Question Reviews');
  });

  it('should contain all essential Sprint 4 endpoint paths', () => {
    const paths = Object.keys(openApiDoc.paths);

    // Media (UC13)
    expect(paths).toContain('/api/v1/media/presigned-url');
    expect(paths).toContain('/api/v1/media/presigned-url/batch');
    expect(paths).toContain('/api/v1/media/confirm');
    expect(paths).toContain('/api/v1/media/{id}');

    // Questions Import (UC14)
    expect(paths).toContain('/api/v1/questions/import');
    expect(paths).toContain('/api/v1/questions/import/template');
    expect(paths).toContain('/api/v1/questions/import/jobs/{id}');

    // Questions Reviews (UC15)
    expect(paths).toContain('/api/v1/questions/reviews/queue');
    expect(paths).toContain('/api/v1/questions/reviews/{id}/approve');
    expect(paths).toContain('/api/v1/questions/reviews/{id}/request-revision');
    expect(paths).toContain('/api/v1/questions/reviews/{id}/reject');
    expect(paths).toContain('/api/v1/questions/reviews/{id}/quick-fix');
    expect(paths).toContain('/api/v1/questions/reviews/batch-approve');
  });

  it('should have Bearer authentication security scheme configured', () => {
    expect(openApiDoc.components?.securitySchemes).toHaveProperty('JWT-auth');
  });

  it('should describe parameters and responses for review queue', () => {
    const queueEndpoint = openApiDoc.paths['/api/v1/questions/reviews/queue'];
    expect(queueEndpoint).toBeDefined();
    expect(queueEndpoint.get).toBeDefined();
    expect(queueEndpoint.get?.responses).toHaveProperty('200');
    expect(queueEndpoint.get?.responses).toHaveProperty('403');
    expect(queueEndpoint.get?.responses).toHaveProperty('429');
  });

  it('should describe quick-fix endpoint with PUT method and requestBody', () => {
    const quickFixEndpoint = openApiDoc.paths['/api/v1/questions/reviews/{id}/quick-fix'];
    expect(quickFixEndpoint).toBeDefined();
    expect(quickFixEndpoint.put).toBeDefined();
    expect(quickFixEndpoint.put?.requestBody).toBeDefined();
    expect(quickFixEndpoint.put?.responses).toHaveProperty('200');
    expect(quickFixEndpoint.put?.responses).toHaveProperty('400');
    expect(quickFixEndpoint.put?.responses).toHaveProperty('409');
    expect(quickFixEndpoint.put?.responses).toHaveProperty('404');
  });
});
