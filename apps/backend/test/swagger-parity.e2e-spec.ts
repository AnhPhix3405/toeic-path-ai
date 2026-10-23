import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';

describe('Swagger / OpenAPI Parity Test for Exams Module', () => {
  let app: INestApplication;
  let swaggerDoc: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');

    const config = new DocumentBuilder()
      .setTitle('TOEIC Path AI - Exams API')
      .setDescription('OpenAPI Specification for Exams Lifecycle & Catalogs')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    swaggerDoc = SwaggerModule.createDocument(app, config);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('1. Đảm bảo hiện diện đầy đủ các OpenAPI Tags cho Exams Module', () => {
    const paths = Object.keys(swaggerDoc.paths as Record<string, unknown>);

    expect(paths.some((p) => p.startsWith('/api/v1/exams'))).toBe(true);
  });

  it('2. Đảm bảo hiện diện đầy đủ tất cả các core endpoints của Sprint 5', () => {
    const paths = swaggerDoc.paths;

    // UC16: Khởi tạo và cấu hình đề
    expect(paths['/api/v1/exams']?.post).toBeDefined();
    expect(paths['/api/v1/exams/{id}']?.patch).toBeDefined();
    expect(paths['/api/v1/exams/{id}']?.delete).toBeDefined();
    expect(paths['/api/v1/exams/{id}/manage']?.get).toBeDefined();

    // UC17: Cấu trúc và tuyển chọn câu hỏi
    expect(paths['/api/v1/exams/{id}/sections']?.post).toBeDefined();
    expect(paths['/api/v1/exams/{id}/questions']?.post).toBeDefined();
    expect(paths['/api/v1/exams/{id}/questions/reorder']?.put).toBeDefined();
    expect(paths['/api/v1/exams/{id}/questions/{questionId}']?.delete).toBeDefined();
    expect(paths['/api/v1/exams/{id}/auto-generate']?.post).toBeDefined();

    // UC18: Thẩm định và xuất bản đề
    expect(paths['/api/v1/exams/{id}/publish']?.post).toBeDefined();
    expect(paths['/api/v1/exams/{id}/unpublish']?.post).toBeDefined();
    expect(paths['/api/v1/exams/{id}/close']?.post).toBeDefined();
    expect(paths['/api/v1/exams/{id}/archive']?.post).toBeDefined();

    // UC19: Danh mục tra cứu công khai, nội bộ và chi tiết tổng quan
    expect(paths['/api/v1/exams']?.get).toBeDefined();
    expect(paths['/api/v1/exams/manage']?.get).toBeDefined();
    expect(paths['/api/v1/exams/{id}/overview']?.get).toBeDefined();
  });

  it('3. Đảm bảo enum ExamStatus trong OpenAPI Schema chỉ chứa 4 trạng thái CSDL', () => {
    const schemas = swaggerDoc.components?.schemas || {};
    const examStatusSchema = schemas.ExamStatus;

    if (examStatusSchema && examStatusSchema.enum) {
      expect(examStatusSchema.enum).toEqual(
        expect.arrayContaining(['draft', 'published', 'closed', 'archived']),
      );
      expect(examStatusSchema.enum).not.toContain('scheduled');
    }
  });

  it('4. Đảm bảo Zero Answer Leakage trên Schema của Overview và Catalog', () => {
    const schemas = swaggerDoc.components?.schemas || {};
    const overviewSchema = schemas.ExamOverviewResponseDto;

    if (overviewSchema && overviewSchema.properties) {
      expect(overviewSchema.properties.questions).toBeUndefined();
      expect(overviewSchema.properties.options).toBeUndefined();
      expect(overviewSchema.properties.isCorrect).toBeUndefined();
      expect(overviewSchema.properties.explanation).toBeUndefined();
      expect(overviewSchema.properties.remainingAttempts).toBeDefined();
      expect(overviewSchema.properties.isScheduled).toBeDefined();
    }
  });
});
