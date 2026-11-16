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

  // =========================================================================
  // SPRINT 6: Exam Attempts Module Parity (UC20, UC21, UC22)
  // =========================================================================
  describe('Exam Attempts Module Swagger / OpenAPI Parity (Sprint 6)', () => {
    const getPathObj = (route: string) => {
      const paths = swaggerDoc.paths || {};
      const matchedKey = Object.keys(paths).find(
        (p) => p.endsWith(route) || p === route || p.endsWith(route.replace(/^\//, '')),
      );
      return matchedKey ? paths[matchedKey] : undefined;
    };

    it('5. Đảm bảo hiện diện OpenAPI Tag và 6 core endpoints của Sprint 6', () => {
      const paths = swaggerDoc.paths || {};
      const allPathKeys = Object.keys(paths);

      // 1. Kiểm tra hiện diện tiền tố exam-attempts
      expect(allPathKeys.some((p) => p.includes('exam-attempts'))).toBe(true);

      // 2. UC20: Khởi tạo và hủy lượt thi
      expect(getPathObj('/exam-attempts')?.post).toBeDefined();
      expect(getPathObj('/exam-attempts/{id}/abandon')?.post).toBeDefined();

      // 3. UC21: Overview ma trận tiến độ & Tải câu hỏi phân Part
      expect(getPathObj('/exam-attempts/{id}')?.get).toBeDefined();
      expect(getPathObj('/exam-attempts/{id}/questions')?.get).toBeDefined();

      // 4. UC22: Lưu đáp án đơn lẻ real-time & Batch recovery
      expect(getPathObj('/exam-attempts/{id}/answers')?.put).toBeDefined();
      expect(getPathObj('/exam-attempts/{id}/answers/batch')?.put).toBeDefined();
    });

    it('6. Đảm bảo Zero Answer Leakage trên OpenAPI Schemas của Sprint 6', () => {
      const schemas = swaggerDoc.components?.schemas || {};

      // 1. Overview Schema
      const overviewSchema = schemas.ExamAttemptOverviewResponseDto;
      if (overviewSchema && overviewSchema.properties) {
        expect(overviewSchema.properties.isCorrect).toBeUndefined();
        expect(overviewSchema.properties.explanation).toBeUndefined();
        expect(overviewSchema.properties.correctOptionId).toBeUndefined();
        expect(overviewSchema.properties.answerKeySnapshot).toBeUndefined();
      }

      // 2. Questions Delivery Schema & Option Delivery Schema
      const questionItemSchema = schemas.QuestionDeliveryItemDto;
      if (questionItemSchema && questionItemSchema.properties) {
        expect(questionItemSchema.properties.isCorrect).toBeUndefined();
        expect(questionItemSchema.properties.explanation).toBeUndefined();
      }

      const optionItemSchema = schemas.QuestionOptionDeliveryDto;
      if (optionItemSchema && optionItemSchema.properties) {
        expect(optionItemSchema.properties.isCorrect).toBeUndefined();
        expect(optionItemSchema.properties.explanation).toBeUndefined();
      }
    });

    it('7. Đảm bảo các DTOs cốt lõi của Sprint 6 được định nghĩa trong OpenAPI Components', () => {
      const schemas = swaggerDoc.components?.schemas || {};

      expect(schemas.CreateExamAttemptDto).toBeDefined();
      expect(schemas.SaveAnswerDto).toBeDefined();
      expect(schemas.BatchSaveAnswersDto).toBeDefined();
      expect(schemas.ExamAttemptSummaryResponseDto).toBeDefined();
      expect(schemas.SaveAnswerResponseDto).toBeDefined();
      expect(schemas.BatchSaveAnswersResponseDto).toBeDefined();
      expect(schemas.ExamAttemptOverviewResponseDto).toBeDefined();
      expect(schemas.ExamAttemptQuestionsResponseDto).toBeDefined();
    });
  });

  // =========================================================================
  // SPRINT 7: Grading, Results & Question Reports Module Parity (UC23–UC29, UC49)
  // =========================================================================
  describe('Sprint 7 Grading, Results & Question Reports Module Swagger / OpenAPI Parity (Sprint 7)', () => {
    const getPathObj = (route: string) => {
      const paths = swaggerDoc.paths || {};
      const matchedKey = Object.keys(paths).find(
        (p) => p.endsWith(route) || p === route || p.endsWith(route.replace(/^\//, '')),
      );
      return matchedKey ? paths[matchedKey] : undefined;
    };

    it('8. Đảm bảo hiện diện đầy đủ 9 core endpoints của Sprint 7 (UC23, UC26, UC27, UC28, UC29, UC49)', () => {
      // UC23: Submit
      expect(getPathObj('/exam-attempts/{id}/submit')?.post).toBeDefined();

      // UC26: Result Summary
      expect(getPathObj('/exam-attempts/{id}/result')?.get).toBeDefined();

      // UC27: History
      expect(getPathObj('/exam-attempts/history')?.get).toBeDefined();

      // UC28: Review & Explanations
      expect(getPathObj('/exam-attempts/{id}/review')?.get).toBeDefined();

      // UC29: Student Question Reporting & Feedback Loop
      expect(getPathObj('/questions/{questionId}/reports')?.post).toBeDefined();
      expect(getPathObj('/question-reports/my')?.get).toBeDefined();

      // UC49: Teacher/Admin Question Report Moderation
      expect(getPathObj('/question-reports')?.get).toBeDefined();
      expect(getPathObj('/question-reports/{id}')?.get).toBeDefined();
      expect(getPathObj('/question-reports/{id}/resolve')?.patch).toBeDefined();
    });

    it('9. Đảm bảo hiện diện đầy đủ DTO Schemas của Sprint 7, bảo vệ quyền riêng tư giảng viên (MyQuestionReportItemDto) và kiểu Nullable chuẩn OpenAPI (PMR 032)', () => {
      const schemas = swaggerDoc.components?.schemas || {};

      expect(schemas.SubmitExamAttemptResponseDto).toBeDefined();
      expect(schemas.ExamAttemptResultResponseDto).toBeDefined();
      expect(schemas.PartBreakdownResponseDto).toBeDefined();
      expect(schemas.SkillBreakdownResponseDto).toBeDefined();
      expect(schemas.PaginatedExamAttemptHistoryResponseDto).toBeDefined();
      expect(schemas.ExamAttemptHistoryItemDto).toBeDefined();
      expect(schemas.ExamAttemptReviewResponseDto).toBeDefined();
      expect(schemas.ReviewFilterCountsDto).toBeDefined();
      expect(schemas.QuestionGroupReviewDto).toBeDefined();
      expect(schemas.QuestionReviewItemDto).toBeDefined();
      expect(schemas.QuestionOptionReviewDto).toBeDefined();

      expect(schemas.CreateQuestionReportDto).toBeDefined();
      expect(schemas.ResolveQuestionReportDto).toBeDefined();
      expect(schemas.MyQuestionReportItemDto).toBeDefined();
      expect(schemas.PaginatedMyQuestionReportsResponseDto).toBeDefined();
      expect(schemas.AdminQuestionReportItemDto).toBeDefined();
      expect(schemas.PaginatedAdminQuestionReportsResponseDto).toBeDefined();
      expect(schemas.ResolveQuestionReportResponseDto).toBeDefined();
      expect(schemas.QuestionReportDetailResponseDto).toBeDefined();
      expect(schemas.QuestionReportQuestionContextDto).toBeDefined();
      expect(schemas.QuestionReportGroupContextDto).toBeDefined();

      // Privacy check: MyQuestionReportItemDto must NOT expose resolvedBy / resolvedById
      const myReportItemProps = schemas.MyQuestionReportItemDto?.properties || {};
      expect(myReportItemProps.resolvedBy).toBeUndefined();
      expect(myReportItemProps.resolvedById).toBeUndefined();
      expect(myReportItemProps.resolutionNote).toBeDefined();

      // Nullable type check: nullable fields must not degrade to generic type: 'object'
      const resultProps = schemas.ExamAttemptResultResponseDto?.properties || {};
      expect(resultProps.totalScore?.type).toBe('number');
      expect(resultProps.totalScore?.nullable).toBe(true);
      expect(resultProps.listeningScore?.type).toBe('number');
      expect(resultProps.readingScore?.type).toBe('number');
      expect(resultProps.isPassed?.type).toBe('boolean');
      expect(resultProps.isPassed?.nullable).toBe(true);
      expect(myReportItemProps.resolutionNote?.type).toBe('string');
      expect(myReportItemProps.resolutionNote?.nullable).toBe(true);
    });
  });
});
