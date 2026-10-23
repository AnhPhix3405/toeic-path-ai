import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { ExamStatus } from '../src/modules/exams/enums/exam-status.enum';
import { ExamType } from '../src/modules/exams/enums/exam-type.enum';
import { UserRole } from '../src/common/enums/user-role.enum';
import { PolicyThrottlerGuard } from '../src/common/rate-limit/guards/policy-throttler.guard';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../src/modules/auth/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { ExamsPublishingService } from '../src/modules/exams/services/exams-publishing.service';
import { QuestionStatus } from '../src/modules/questions/enums/question-status.enum';
import { QuestionType } from '../src/modules/questions/enums/question-type.enum';

describe('Sprint 5 Comprehensive E2E Integration (e2e)', () => {
  jest.setTimeout(45000);

  let app: INestApplication;
  let dataSource: DataSource;
  let publishingService: ExamsPublishingService;

  // Actors lấy từ DB thật để thỏa mãn khóa ngoại FK_exams_created_by
  const teacherCreator = {
    id: '20000000-0000-4000-8000-000000000001',
    sessionId: 'session-teacher-1',
    email: 'teacher1@example.com',
    role: UserRole.TEACHER,
  };

  const teacherOther = {
    id: '2be130b5-0cb2-4fe6-8eeb-273e3531ef7e',
    sessionId: 'session-teacher-2',
    email: 'teacher@example.com',
    role: UserRole.TEACHER,
  };

  const studentUser = {
    id: '9d694ccb-7b0c-4f5d-adb5-a24357a322f9',
    sessionId: 'session-student',
    email: 'swagger.task9.student@example.com',
    role: UserRole.STUDENT,
  };

  let currentUser: any = teacherCreator;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(PolicyThrottlerGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();
          req.user = currentUser;
          return true;
        },
      })
      .overrideGuard(OptionalJwtAuthGuard)
      .useValue({
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();
          req.user = currentUser;
          return true;
        },
        handleRequest: (_err: any, user: any) => user ?? null,
      })
      .overrideGuard(RolesGuard)
      .useValue({
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();
          const handler = context.getHandler();
          const classRef = context.getClass();
          const roles =
            Reflect.getMetadata('roles', handler) || Reflect.getMetadata('roles', classRef);
          if (!roles || roles.length === 0) return true;
          return roles.includes(req.user?.role);
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );

    await app.init();

    dataSource = app.get(DataSource);
    publishingService = app.get(ExamsPublishingService);

    // Dọn dẹp dữ liệu cũ nếu có
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    if (app) {
      await app.close();
    }
  });

  async function cleanupTestData() {
    if (!dataSource || !dataSource.isInitialized) return;
    const qr = dataSource.createQueryRunner();
    await qr.connect();
    try {
      await qr.query(
        `DELETE FROM exam_questions WHERE exam_id IN (SELECT id FROM exams WHERE title LIKE 'TEST_E2E_%')`,
      );
      await qr.query(
        `DELETE FROM exam_sections WHERE exam_id IN (SELECT id FROM exams WHERE title LIKE 'TEST_E2E_%')`,
      );
      await qr.query(`DELETE FROM exams WHERE title LIKE 'TEST_E2E_%'`);
      await qr.query(
        `DELETE FROM question_options WHERE question_id IN (SELECT id FROM questions WHERE content LIKE 'TEST_E2E_%')`,
      );
      await qr.query(`DELETE FROM media_resources WHERE file_name LIKE 'TEST_E2E_%'`);
      await qr.query(`DELETE FROM questions WHERE content LIKE 'TEST_E2E_%'`);
      await qr.query(`DELETE FROM question_groups WHERE title LIKE 'TEST_E2E_%'`);
    } catch {
      // ignore
    } finally {
      await qr.release();
    }
  }

  /**
   * Helper nạp nhanh 200 câu hỏi test cho Full Test trực tiếp vào CSDL
   */
  async function seedFullTestQuestions(examId: string) {
    const qr = dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // 1. Lấy danh sách sections của exam
      const sections = await qr.query(
        `SELECT es.id, es.part_id, tp.part_number
         FROM exam_sections es
         JOIN toeic_parts tp ON tp.id = es.part_id
         WHERE es.exam_id = $1
         ORDER BY tp.part_number ASC`,
        [examId],
      );

      const sectionMap = new Map<number, { id: string; partId: string }>();
      for (const s of sections) {
        sectionMap.set(s.part_number, { id: s.id, partId: s.part_id });
      }

      // 2. Tạo 1 QuestionGroup mẫu cho các Part nhóm (Part 3, 4, 6, 7)
      const groupRes = await qr.query(
        `INSERT INTO question_groups (id, title, context, created_by)
         VALUES (gen_random_uuid(), 'TEST_E2E_Group_3', 'Group conversation context', $1)
         RETURNING id`,
        [teacherCreator.id],
      );
      const groupId = groupRes[0].id;

      // Chuẩn TOEIC Part counts: 6, 25, 39, 30, 30, 16, 54
      const targetCounts: Record<number, number> = {
        1: 6,
        2: 25,
        3: 39,
        4: 30,
        5: 30,
        6: 16,
        7: 54,
      };

      let globalOrderIndex = 1;

      for (let p = 1; p <= 7; p++) {
        const count = targetCounts[p];
        const sec = sectionMap.get(p)!;

        for (let i = 1; i <= count; i++) {
          const qIdRes = await qr.query(
            `INSERT INTO questions (id, content, question_type, status, part_id, created_by, question_group_id, group_order, version)
             VALUES (gen_random_uuid(), 'TEST_E2E_Q_${globalOrderIndex}', $1, $2, $3, $4, $5, $6, 1)
             RETURNING id`,
            [
              QuestionType.SINGLE_CHOICE,
              QuestionStatus.PUBLISHED,
              sec.partId,
              teacherCreator.id,
              p === 3 ? groupId : null,
              p === 3 ? i : null,
            ],
          );
          const qId = qIdRes[0].id;

          // Tạo 4 options (label: A, B, C, D; A là đúng)
          await qr.query(
            `INSERT INTO question_options (id, question_id, label, content, is_correct, position)
             VALUES
             (gen_random_uuid(), $1, 'A', 'Option A', true, 1),
             (gen_random_uuid(), $1, 'B', 'Option B', false, 2),
             (gen_random_uuid(), $1, 'C', 'Option C', false, 3),
             (gen_random_uuid(), $1, 'D', 'Option D', false, 4)`,
            [qId],
          );

          // Tạo media audio nếu Part 1..4, media image nếu Part 1
          if (p >= 1 && p <= 4) {
            await qr.query(
              `INSERT INTO media_resources (id, file_name, file_url, resource_type, mime_type, file_size, question_id, created_by)
               VALUES (gen_random_uuid(), 'TEST_E2E_audio_${globalOrderIndex}.mp3', 'https://storage/audio.mp3', 'audio', 'audio/mpeg', 1024, $1, $2)`,
              [qId, teacherCreator.id],
            );
          }
          if (p === 1) {
            await qr.query(
              `INSERT INTO media_resources (id, file_name, file_url, resource_type, mime_type, file_size, question_id, created_by)
               VALUES (gen_random_uuid(), 'TEST_E2E_image_${globalOrderIndex}.jpg', 'https://storage/image.jpg', 'image', 'image/jpeg', 2048, $1, $2)`,
              [qId, teacherCreator.id],
            );
          }

          // Link vào exam_questions
          await qr.query(
            `INSERT INTO exam_questions (id, exam_id, exam_section_id, question_id, question_group_id, order_index)
             VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)`,
            [examId, sec.id, qId, p === 3 ? groupId : null, globalOrderIndex],
          );

          globalOrderIndex++;
        }
      }

      await qr.commitTransaction();
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }
  }

  describe('Luồng 1: Vòng Đời Đề Thi Full Test Liên Hoàn (UC16, UC17, UC18)', () => {
    let fullExamId: string;
    let fullExamVersion = 1;

    it('1.1 Tạo đề thi Full Test -> Auto-seeding 7 sections chuẩn TOEIC (UC16)', async () => {
      currentUser = teacherCreator;
      const res = await request(app.getHttpServer())
        .post('/api/v1/exams')
        .send({
          title: 'TEST_E2E_ETS_TOEIC_2026_FullTest_01',
          description: 'Mô tả bài thi thử E2E',
          type: ExamType.FULL_TEST,
          durationMinutes: 120,
          allowPartPractice: true,
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.sectionsCount).toBe(7);
      expect(res.body.sections.length).toBe(7);
      expect(res.body.status).toBe(ExamStatus.DRAFT);

      fullExamId = res.body.id;
      fullExamVersion = res.body.version;
    });

    it('1.2 Cập nhật cấu hình đề thi với Optimistic Locking (UC16)', async () => {
      currentUser = teacherCreator;
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/exams/${fullExamId}`)
        .send({
          title: 'TEST_E2E_ETS_TOEIC_2026_FullTest_Updated',
          version: fullExamVersion,
        })
        .expect(200);

      expect(res.body.title).toBe('TEST_E2E_ETS_TOEIC_2026_FullTest_Updated');
      expect(res.body.version).toBe(fullExamVersion + 1);
      fullExamVersion = res.body.version;
    });

    it('1.3 Thử xuất bản đề thi khi chưa nạp câu hỏi -> Bị chặn 400 Bad Request (UC18)', async () => {
      currentUser = teacherCreator;
      const res = await request(app.getHttpServer())
        .post(`/api/v1/exams/${fullExamId}/publish`)
        .send({
          version: fullExamVersion,
        })
        .expect(400);

      expect(res.body.message).toBeDefined();
    });

    it('1.4 Nạp 200 câu hỏi chuẩn TOEIC qua Fixture -> Thẩm định & Xuất bản thành công (UC18)', async () => {
      await seedFullTestQuestions(fullExamId);

      currentUser = teacherCreator;
      const res = await request(app.getHttpServer())
        .post(`/api/v1/exams/${fullExamId}/publish`)
        .send({
          version: fullExamVersion,
        })
        .expect(200);

      expect(res.body.status).toBe(ExamStatus.PUBLISHED);
      expect(res.body.version).toBe(fullExamVersion + 1);
      expect(res.body.isScheduled).toBe(false);
      fullExamVersion = res.body.version;
    });

    it('1.5 Unpublish Guard: Chuyển về Draft thành công khi chưa có bài nộp (UC18)', async () => {
      currentUser = teacherCreator;
      const res = await request(app.getHttpServer())
        .post(`/api/v1/exams/${fullExamId}/unpublish`)
        .send({
          version: fullExamVersion,
        })
        .expect(200);

      expect(res.body.status).toBe(ExamStatus.DRAFT);
      expect(res.body.version).toBe(fullExamVersion + 1);
      fullExamVersion = res.body.version;
    });

    it('1.6 Re-publish -> Đóng đề -> Lưu trữ đề (UC18 Lifecycle)', async () => {
      currentUser = teacherCreator;
      // Re-publish
      const pubRes = await request(app.getHttpServer())
        .post(`/api/v1/exams/${fullExamId}/publish`)
        .send({ version: fullExamVersion })
        .expect(200);
      expect(pubRes.body.status).toBe(ExamStatus.PUBLISHED);
      fullExamVersion = pubRes.body.version;

      // Close
      const closeRes = await request(app.getHttpServer())
        .post(`/api/v1/exams/${fullExamId}/close`)
        .send({ version: fullExamVersion })
        .expect(200);
      expect(closeRes.body.status).toBe(ExamStatus.CLOSED);
      fullExamVersion = closeRes.body.version;

      // Archive
      const archiveRes = await request(app.getHttpServer())
        .post(`/api/v1/exams/${fullExamId}/archive`)
        .send({ version: fullExamVersion })
        .expect(200);
      expect(archiveRes.body.status).toBe(ExamStatus.ARCHIVED);
    });
  });

  describe('Luồng 2: Tra Cứu Catalog & Bảo Mật Zero Answer Leakage (UC19)', () => {
    let catalogExamId: string;

    beforeAll(async () => {
      // Tạo 1 đề thi published để test catalog
      currentUser = teacherCreator;
      const res = await request(app.getHttpServer())
        .post('/api/v1/exams')
        .send({
          title: 'TEST_E2E_Public_Catalog_Exam',
          type: ExamType.FULL_TEST,
          durationMinutes: 120,
        })
        .expect(201);

      catalogExamId = res.body.id;
      await seedFullTestQuestions(catalogExamId);

      await request(app.getHttpServer())
        .post(`/api/v1/exams/${catalogExamId}/publish`)
        .send({ version: res.body.version })
        .expect(200);
    });

    it('2.1 Tra cứu Public Catalog: trả về envelope chuẩn và không lộ thông tin nhạy cảm', async () => {
      currentUser = null; // Khách vãng lai
      const res = await request(app.getHttpServer()).get('/api/v1/exams?limit=10').expect(200);

      expect(res.body.items).toBeDefined();
      expect(Array.isArray(res.body.items)).toBe(true);
      expect(res.body.total).toBeGreaterThanOrEqual(1);
      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(10);
      expect(res.body.totalPages).toBeDefined();

      const item = res.body.items.find((i: any) => i.id === catalogExamId);
      expect(item).toBeDefined();
      expect(item.totalQuestions).toBe(200);
      expect(item.totalAttempts).toBe(0);
      expect(item.isScheduled).toBe(false);
    });

    it('2.2 Siết giới hạn phân trang limit max 50 (Tech Debt 003)', async () => {
      currentUser = null;
      await request(app.getHttpServer()).get('/api/v1/exams?limit=51').expect(400);
    });

    it('2.3 Management Catalog: Teacher chỉ xem đề của mình hoặc đề published', async () => {
      currentUser = teacherOther;
      const res = await request(app.getHttpServer())
        .get('/api/v1/exams/manage?limit=10')
        .expect(200);

      expect(res.body.items).toBeDefined();
      // Đề catalogExamId ở trạng thái published nên teacherOther vẫn xem được
      const item = res.body.items.find((i: any) => i.id === catalogExamId);
      expect(item).toBeDefined();
    });

    it('2.4 Zero Answer Leakage Invariant: GET /overview không chứa câu hỏi, options, isCorrect, explanation', async () => {
      currentUser = studentUser;
      const res = await request(app.getHttpServer())
        .get(`/api/v1/exams/${catalogExamId}/overview`)
        .expect(200);

      expect(res.body.id).toBe(catalogExamId);
      expect(res.body.totalQuestions).toBe(200);
      expect(res.body.parts.length).toBe(7);
      expect(res.body.parts[0].partNumber).toBe(1);

      // Invariant check
      expect(res.body.questions).toBeUndefined();
      expect(res.body.options).toBeUndefined();
      expect(res.body.isCorrect).toBeUndefined();
      expect(res.body.explanation).toBeUndefined();
    });
  });

  describe('Luồng 3: Cronjob Tự Động Đóng Đề Theo Lịch', () => {
    it('3.1 Tự động đóng đề khi quá hạn close_at qua handleScheduledExamClosure()', async () => {
      currentUser = teacherCreator;
      // Tạo 1 đề bình thường và publish
      const res = await request(app.getHttpServer())
        .post('/api/v1/exams')
        .send({
          title: 'TEST_E2E_Expired_Exam',
          type: ExamType.FULL_TEST,
          durationMinutes: 120,
        })
        .expect(201);

      const expExamId = res.body.id;
      await seedFullTestQuestions(expExamId);

      // Publish đề
      await request(app.getHttpServer())
        .post(`/api/v1/exams/${expExamId}/publish`)
        .send({ version: res.body.version })
        .expect(200);

      // Cập nhật close_at về quá khứ trực tiếp trong CSDL để mô phỏng đề thi vừa hết hạn
      const qr = dataSource.createQueryRunner();
      await qr.connect();
      await qr.query(`UPDATE exams SET close_at = NOW() - INTERVAL '1 hour' WHERE id = $1`, [
        expExamId,
      ]);
      await qr.release();

      // Gọi trực tiếp Cronjob handler
      const closedCount = await publishingService.handleScheduledExamClosure();
      expect(closedCount).toBeGreaterThanOrEqual(1);

      // Kiểm tra đề đã đổi trạng thái CLOSED
      const checkRes = await request(app.getHttpServer())
        .get(`/api/v1/exams/${expExamId}/manage`)
        .expect(200);

      expect(checkRes.body.status).toBe(ExamStatus.CLOSED);
    });
  });

  describe('Luồng 4: Perimeter Defenses & RBAC Protection', () => {
    it('4.1 Student bị chặn 403 Forbidden khi cố gắng tạo đề thi', async () => {
      currentUser = studentUser;
      await request(app.getHttpServer())
        .post('/api/v1/exams')
        .send({
          title: 'TEST_E2E_Hacker_Exam',
          type: ExamType.FULL_TEST,
          durationMinutes: 120,
        })
        .expect(403);
    });

    it('4.2 Teacher bị chặn 403 Forbidden khi cố gắng sửa đề của giáo viên khác', async () => {
      currentUser = teacherCreator;
      const res = await request(app.getHttpServer())
        .post('/api/v1/exams')
        .send({
          title: 'TEST_E2E_Teacher1_Exam',
          type: ExamType.FULL_TEST,
          durationMinutes: 120,
        })
        .expect(201);

      currentUser = teacherOther;
      await request(app.getHttpServer())
        .patch(`/api/v1/exams/${res.body.id}`)
        .send({
          title: 'TEST_E2E_Teacher1_Exam_Hacked',
          version: res.body.version,
        })
        .expect(403);
    });
  });
});
