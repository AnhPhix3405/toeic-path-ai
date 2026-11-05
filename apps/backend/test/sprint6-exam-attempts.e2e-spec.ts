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
import { RolesGuard } from '../src/common/guards/roles.guard';
import { QuestionStatus } from '../src/modules/questions/enums/question-status.enum';
import { QuestionType } from '../src/modules/questions/enums/question-type.enum';
import { PartPracticeMode } from '../src/modules/exam-attempts/enums/part-practice-mode.enum';
import { ExamAttemptStatus } from '../src/modules/exam-attempts/enums/exam-attempt-status.enum';

describe('Sprint 6 Exam Attempts Comprehensive E2E (e2e)', () => {
  jest.setTimeout(60000);

  let app: INestApplication;
  let dataSource: DataSource;

  // Actors riêng biệt cho từng Flow để cô lập CSDL và tránh đụng Partial Unique Index (PMR 024)
  const teacherCreator = {
    id: '20000000-0000-4000-8000-000000000001',
    sessionId: 'session-teacher-1',
    email: 'teacher1@example.com',
    role: UserRole.TEACHER,
  };

  const studentFlow1 = {
    id: '9d694ccb-7b0c-4f5d-adb5-a24357a322f9',
    sessionId: 'session-student-1',
    email: 'swagger.task9.student@example.com',
    role: UserRole.STUDENT,
  };

  const studentFlow2 = {
    id: '0ca6d8c0-7d63-4aad-9963-631d9adbc1be',
    sessionId: 'session-student-2',
    email: 'swagger.task7.001@example.com',
    role: UserRole.STUDENT,
  };

  const studentFlow3 = {
    id: 'add20ac3-1fff-4d42-b6c2-af510e062e11',
    sessionId: 'session-student-3',
    email: 'sprint3.task2.student@example.com',
    role: UserRole.STUDENT,
  };

  const studentFlow4 = {
    id: 'b045a405-e072-4639-a7d6-ccbc3a4f3391',
    sessionId: 'session-student-4',
    email: 'student.b@example.com',
    role: UserRole.STUDENT,
  };

  const studentFlow5 = {
    id: 'cdd2a66f-9a01-4b07-abc1-fd26fdcea3a1',
    sessionId: 'session-student-5',
    email: 'sprint3.task5.student@example.com',
    role: UserRole.STUDENT,
  };

  const adminUser = {
    id: '0962bc45-0727-4eda-b081-44059b892ca5',
    sessionId: 'session-admin',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
  };

  let currentUser: any = studentFlow1;

  let fullExamId: string;
  let anotherExamId: string;

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

    // 1. Dọn dẹp dữ liệu test cũ nếu có
    await cleanupTestData();

    // 2. Tạo đề thi mẫu Full Test và Another Exam cho Sprint 6
    await setupTestExams();
  });

  afterAll(async () => {
    await cleanupTestData();
    if (app) {
      await app.close();
    }
  });

  /**
   * Dọn dẹp dữ liệu test theo đúng thứ tự 7 tầng khóa ngoại (PMR 024)
   */
  async function cleanupTestData() {
    if (!dataSource || !dataSource.isInitialized) return;
    const qr = dataSource.createQueryRunner();
    await qr.connect();
    try {
      await qr.query(`
        DELETE FROM exam_attempt_answers WHERE attempt_id IN (
          SELECT id FROM exam_attempts WHERE exam_id IN (SELECT id FROM exams WHERE title LIKE 'TEST_SPR6_%')
        );
      `);
      await qr.query(`
        DELETE FROM exam_attempt_snapshots WHERE attempt_id IN (
          SELECT id FROM exam_attempts WHERE exam_id IN (SELECT id FROM exams WHERE title LIKE 'TEST_SPR6_%')
        );
      `);
      await qr.query(`
        DELETE FROM exam_attempts WHERE exam_id IN (SELECT id FROM exams WHERE title LIKE 'TEST_SPR6_%');
      `);
      await qr.query(`
        DELETE FROM exam_questions WHERE exam_id IN (SELECT id FROM exams WHERE title LIKE 'TEST_SPR6_%');
      `);
      await qr.query(`
        DELETE FROM exam_sections WHERE exam_id IN (SELECT id FROM exams WHERE title LIKE 'TEST_SPR6_%');
      `);
      await qr.query(`DELETE FROM exams WHERE title LIKE 'TEST_SPR6_%';`);
      await qr.query(`
        DELETE FROM question_options WHERE question_id IN (SELECT id FROM questions WHERE content LIKE 'TEST_SPR6_%');
      `);
      await qr.query(`DELETE FROM questions WHERE content LIKE 'TEST_SPR6_%';`);
      await qr.query(`DELETE FROM question_groups WHERE title LIKE 'TEST_SPR6_%';`);
    } catch {
      // ignore
    } finally {
      await qr.release();
    }
  }

  /**
   * Tạo 2 đề thi mẫu `published` phục vụ kiểm thử E2E:
   * 1. fullExam: Đề thi Full Test 7 Parts có QuestionGroups và Single questions.
   * 2. anotherExam: Đề thi thứ hai để kiểm tra Conflict 409 khác đề.
   */
  async function setupTestExams() {
    const qr = dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // Lấy danh mục 7 part_id từ toeic_parts
      const parts = await qr.query(
        `SELECT id, part_number FROM toeic_parts ORDER BY part_number ASC`,
      );
      const partMap = new Map<number, string>();
      for (const p of parts) {
        partMap.set(p.part_number, p.id);
      }

      // 1. Tạo fullExamId
      const fullExamRes = await qr.query(
        `INSERT INTO exams (id, title, description, type, status, duration_minutes, allow_part_practice, max_attempts, is_shuffled_questions, is_shuffled_options, created_by, version)
         VALUES (gen_random_uuid(), 'TEST_SPR6_Full_Exam_01', 'Đề thi E2E Sprint 6', $1, $2, 120, true, 2, true, true, $3, 1)
         RETURNING id`,
        [ExamType.FULL_TEST, ExamStatus.PUBLISHED, teacherCreator.id],
      );
      fullExamId = fullExamRes[0].id;

      // 2. Kế hoạch tạo bộ câu hỏi phong phú cho fullExam:
      // Part 1: 2 câu đơn
      // Part 2: 2 câu đơn
      // Part 3: 3 câu chung Group 3
      // Part 4: 3 câu chung Group 4
      // Part 5: 4 câu đơn
      // Part 6: 3 câu chung Group 6
      // Part 7: 3 câu chung Group 7
      // Tổng cộng: 20 câu
      const partQuestionPlan: Record<number, { count: number; isGroup: boolean }> = {
        1: { count: 2, isGroup: false },
        2: { count: 2, isGroup: false },
        3: { count: 3, isGroup: true },
        4: { count: 3, isGroup: true },
        5: { count: 4, isGroup: false },
        6: { count: 3, isGroup: true },
        7: { count: 3, isGroup: true },
      };

      // 3. Tạo 7 sections cho fullExamId
      const sectionMap = new Map<number, string>();
      for (let p = 1; p <= 7; p++) {
        const secRes = await qr.query(
          `INSERT INTO exam_sections (id, exam_id, part_id, target_questions_count, target_duration_minutes)
           VALUES (gen_random_uuid(), $1, $2, $3, $4)
           RETURNING id`,
          [fullExamId, partMap.get(p), partQuestionPlan[p].count, p === 5 ? 12 : p === 6 ? 8 : 15],
        );
        sectionMap.set(p, secRes[0].id);
      }

      // 4. Tạo QuestionGroups mẫu cho Part 3, 4, 6, 7 (để test Deduplication)
      const groupMap = new Map<number, string>();
      for (const p of [3, 4, 6, 7]) {
        const gRes = await qr.query(
          `INSERT INTO question_groups (id, title, context, created_by)
           VALUES (gen_random_uuid(), 'TEST_SPR6_Group_Part_${p}', 'Sample passage context for part ${p}', $1)
           RETURNING id`,
          [teacherCreator.id],
        );
        groupMap.set(p, gRes[0].id);
      }

      let orderIdx = 1;

      for (let p = 1; p <= 7; p++) {
        const plan = partQuestionPlan[p];
        const secId = sectionMap.get(p)!;
        const partId = partMap.get(p)!;
        const groupId = plan.isGroup ? groupMap.get(p)! : null;

        for (let i = 1; i <= plan.count; i++) {
          const qRes = await qr.query(
            `INSERT INTO questions (id, content, question_type, status, part_id, created_by, question_group_id, group_order, version)
             VALUES (gen_random_uuid(), 'TEST_SPR6_Q_${orderIdx}', $1, $2, $3, $4, $5, $6, 1)
             RETURNING id`,
            [
              QuestionType.SINGLE_CHOICE,
              QuestionStatus.PUBLISHED,
              partId,
              teacherCreator.id,
              groupId,
              plan.isGroup ? i : null,
            ],
          );
          const qId = qRes[0].id;

          // Tạo 4 Options A, B, C, D
          await qr.query(
            `INSERT INTO question_options (id, question_id, label, content, is_correct, position)
             VALUES
             (gen_random_uuid(), $1, 'A', 'Option A content', true, 1),
             (gen_random_uuid(), $1, 'B', 'Option B content', false, 2),
             (gen_random_uuid(), $1, 'C', 'Option C content', false, 3),
             (gen_random_uuid(), $1, 'D', 'Option D content', false, 4)`,
            [qId],
          );

          // Gắn vào exam_questions
          await qr.query(
            `INSERT INTO exam_questions (id, exam_id, exam_section_id, question_id, question_group_id, group_order, order_index)
             VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)`,
            [fullExamId, secId, qId, groupId, plan.isGroup ? i : null, orderIdx],
          );

          orderIdx++;
        }
      }

      // 5. Tạo anotherExamId
      const anotherExamRes = await qr.query(
        `INSERT INTO exams (id, title, description, type, status, duration_minutes, allow_part_practice, max_attempts, created_by, version)
         VALUES (gen_random_uuid(), 'TEST_SPR6_Another_Exam_02', 'Đề thi thứ hai để test Conflict', $1, $2, 60, true, 3, $3, 1)
         RETURNING id`,
        [ExamType.MINI_TEST, ExamStatus.PUBLISHED, teacherCreator.id],
      );
      anotherExamId = anotherExamRes[0].id;

      // Tạo 1 section Part 5 cho anotherExamId
      const anotherSecRes = await qr.query(
        `INSERT INTO exam_sections (id, exam_id, part_id, target_questions_count, target_duration_minutes)
         VALUES (gen_random_uuid(), $1, $2, 2, 15)
         RETURNING id`,
        [anotherExamId, partMap.get(5)],
      );
      const anotherSecId = anotherSecRes[0].id;

      // Tạo 2 câu hỏi cho anotherExam
      for (let j = 1; j <= 2; j++) {
        const qRes = await qr.query(
          `INSERT INTO questions (id, content, question_type, status, part_id, created_by, version)
           VALUES (gen_random_uuid(), 'TEST_SPR6_Another_Q_${j}', $1, $2, $3, $4, 1)
           RETURNING id`,
          [QuestionType.SINGLE_CHOICE, QuestionStatus.PUBLISHED, partMap.get(5), teacherCreator.id],
        );
        const qId = qRes[0].id;

        await qr.query(
          `INSERT INTO question_options (id, question_id, label, content, is_correct, position)
           VALUES
           (gen_random_uuid(), $1, 'A', 'Option A', true, 1),
           (gen_random_uuid(), $1, 'B', 'Option B', false, 2)`,
          [qId],
        );

        await qr.query(
          `INSERT INTO exam_questions (id, exam_id, exam_section_id, question_id, order_index)
           VALUES (gen_random_uuid(), $1, $2, $3, $4)`,
          [anotherExamId, anotherSecId, qId, j],
        );
      }

      await qr.commitTransaction();
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }
  }

  // =========================================================================
  // FLOW 1: Full Test Standard Lifecycle, Shuffling & Zero Answer Leakage
  // =========================================================================
  describe('Flow 1: Full Test Standard Lifecycle, Shuffling & Zero Answer Leakage (UC20, UC21, UC22)', () => {
    let attemptId: string;
    let firstQuestionId: string;
    let selectedOptionId: string;

    it('1.1 Bắt đầu Full Test mới -> Nhận 201 Created và DTO tóm tắt', async () => {
      currentUser = studentFlow1;
      const res = await request(app.getHttpServer())
        .post('/api/v1/exam-attempts')
        .send({
          examId: fullExamId,
          mode: PartPracticeMode.FULL_EXAM,
        })
        .expect(201);

      expect(res.body.attemptId).toBeDefined();
      expect(res.body.examId).toBe(fullExamId);
      expect(res.body.status).toBe(ExamAttemptStatus.IN_PROGRESS);
      expect(res.body.mode).toBe(PartPracticeMode.FULL_EXAM);
      expect(res.body.totalQuestions).toBe(20);
      expect(res.body.isResumed).toBe(false);
      expect(res.body.remainingSeconds).toBeGreaterThan(7000);

      attemptId = res.body.attemptId;
    });

    it('1.2 Kiểm tra Snapshot trong CSDL: Shuffled questions & Tách biệt answer_key_snapshot (Zero Answer Leakage)', async () => {
      const qr = dataSource.createQueryRunner();
      await qr.connect();
      try {
        const snapshots = await qr.query(
          `SELECT * FROM exam_attempt_snapshots WHERE attempt_id = $1`,
          [attemptId],
        );
        expect(snapshots.length).toBe(1);

        const snapshot = snapshots[0];
        expect(snapshot.shuffled_questions.length).toBe(20);
        expect(Object.keys(snapshot.answer_key_snapshot).length).toBe(20);

        // Xác nhận shuffled_questions không chứa đáp án đúng
        for (const q of snapshot.shuffled_questions) {
          expect(q.isCorrect).toBeUndefined();
          expect(q.explanation).toBeUndefined();
          for (const opt of q.options || []) {
            expect(opt.isCorrect).toBeUndefined();
          }
        }
      } finally {
        await qr.release();
      }
    });

    it('1.3 Tải thông tin Overview bài thi (UC21) -> Ma trận tiến độ 1..N đầy đủ', async () => {
      currentUser = studentFlow1;
      const res = await request(app.getHttpServer())
        .get(`/api/v1/exam-attempts/${attemptId}`)
        .expect(200);

      expect(res.body.id).toBe(attemptId);
      expect(res.body.examTitle).toBe('TEST_SPR6_Full_Exam_01');
      expect(res.body.totalQuestions).toBe(20);
      expect(res.body.answeredCount).toBe(0);
      expect(res.body.isExpired).toBe(false);
      expect(res.body.serverTimeNow).toBeDefined();

      // Kiểm tra ma trận tiến độ đầy đủ 20 câu hỏi
      expect(res.body.questionsProgress.length).toBe(20);
      for (const q of res.body.questionsProgress) {
        expect(q.isAnswered).toBe(false);
        expect(q.isMarkedForReview).toBe(false);
        expect(q.questionId).toBeDefined();
        expect(q.orderIndex).toBeGreaterThanOrEqual(1);
      }

      // Xác nhận Zero Answer Leakage
      expect(res.body.isCorrect).toBeUndefined();
      expect(res.body.explanation).toBeUndefined();
    });

    it('1.4 Tải nội dung câu hỏi phân Part kèm Deduplication (UC21) -> Split-view UI sạch', async () => {
      currentUser = studentFlow1;
      const res = await request(app.getHttpServer())
        .get(`/api/v1/exam-attempts/${attemptId}/questions`)
        .expect(200);

      expect(res.body.attemptId).toBe(attemptId);
      expect(res.body.totalQuestionsInPart).toBe(20);
      expect(res.body.questions.length).toBe(20);

      // Xác nhận mảng questionGroups đã deduplicate (chỉ có 4 nhóm cho Part 3, 4, 6, 7)
      expect(res.body.questionGroups.length).toBe(4);
      const groupIds = res.body.questionGroups.map((g: any) => g.id);
      const uniqueGroupIds = new Set(groupIds);
      expect(uniqueGroupIds.size).toBe(4);

      // Lưu lại câu hỏi đầu tiên để test lưu đáp án
      firstQuestionId = res.body.questions[0].id;
      selectedOptionId = res.body.questions[0].options[0].id;
      expect(firstQuestionId).toBeDefined();
      expect(selectedOptionId).toBeDefined();

      // Xác nhận Zero Answer Leakage trên Questions API
      for (const q of res.body.questions) {
        expect(q.isCorrect).toBeUndefined();
        expect(q.explanation).toBeUndefined();
        for (const opt of q.options) {
          expect(opt.isCorrect).toBeUndefined();
        }
      }
    });

    it('1.5 Tự động lưu đáp án đơn lẻ real-time với Conditional Upsert (UC22)', async () => {
      currentUser = studentFlow1;
      const res = await request(app.getHttpServer())
        .put(`/api/v1/exam-attempts/${attemptId}/answers`)
        .send({
          questionId: firstQuestionId,
          selectedOptionId: selectedOptionId,
          isMarkedForReview: true,
          timeSpentSeconds: 15,
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.questionId).toBe(firstQuestionId);
      expect(res.body.selectedOptionId).toBe(selectedOptionId);
      expect(res.body.isMarkedForReview).toBe(true);
      expect(res.body.answeredCount).toBe(1);
      expect(res.body.remainingSeconds).toBeGreaterThan(0);
    });

    it('1.6 F5 / Tải lại bài thi -> Xác nhận khôi phục phiên dở dang nguyên vẹn', async () => {
      currentUser = studentFlow1;

      // 1. Tải lại Overview
      const overviewRes = await request(app.getHttpServer())
        .get(`/api/v1/exam-attempts/${attemptId}`)
        .expect(200);

      expect(overviewRes.body.answeredCount).toBe(1);
      const answeredItem = overviewRes.body.questionsProgress.find(
        (q: any) => q.questionId === firstQuestionId,
      );
      expect(answeredItem.isAnswered).toBe(true);
      expect(answeredItem.isMarkedForReview).toBe(true);

      // 2. Tải lại Questions
      const questionsRes = await request(app.getHttpServer())
        .get(`/api/v1/exam-attempts/${attemptId}/questions`)
        .expect(200);

      const targetQ = questionsRes.body.questions.find((q: any) => q.id === firstQuestionId);
      expect(targetQ.selectedOptionId).toBe(selectedOptionId);
      expect(targetQ.isMarkedForReview).toBe(true);
    });
  });

  // =========================================================================
  // FLOW 2: Part Practice & Part Boundary Validation
  // =========================================================================
  describe('Flow 2: Part Practice & Part Boundary Validation (UC20, UC21)', () => {
    let partAttemptId: string;

    it('2.1 Bắt đầu Part Practice với Part 5 & Part 6 -> Chỉ nạp đúng câu hỏi thuộc 2 Part này', async () => {
      currentUser = studentFlow2;
      const res = await request(app.getHttpServer())
        .post('/api/v1/exam-attempts')
        .send({
          examId: fullExamId,
          mode: PartPracticeMode.PART_PRACTICE,
          selectedParts: [5, 6],
        })
        .expect(201);

      expect(res.body.mode).toBe(PartPracticeMode.PART_PRACTICE);
      // Part 5 có 4 câu, Part 6 có 3 câu => Tổng 7 câu
      expect(res.body.totalQuestions).toBe(7);
      expect(res.body.remainingSeconds).toBeGreaterThan(0);

      partAttemptId = res.body.attemptId;
    });

    it('2.2 Lọc câu hỏi theo Part 5 hợp lệ -> Trả về đúng 4 câu hỏi', async () => {
      currentUser = studentFlow2;
      const res = await request(app.getHttpServer())
        .get(`/api/v1/exam-attempts/${partAttemptId}/questions?partNumber=5`)
        .expect(200);

      expect(res.body.partNumber).toBe(5);
      expect(res.body.totalQuestionsInPart).toBe(4);
      expect(res.body.questions.length).toBe(4);
      for (const q of res.body.questions) {
        expect(q.partNumber).toBe(5);
      }
    });

    it('2.3 Edge Case Validation: Yêu cầu Part 1 không thuộc selectedParts [5, 6] -> Bị từ chối 400 ERR_PART_NOT_IN_ATTEMPT', async () => {
      currentUser = studentFlow2;
      const res = await request(app.getHttpServer())
        .get(`/api/v1/exam-attempts/${partAttemptId}/questions?partNumber=1`)
        .expect(400);

      expect(res.body.errorCode).toBe('ERR_PART_NOT_IN_ATTEMPT');
    });

    it('2.4 Part Practice không bị trừ lượt thi vào max_attempts', async () => {
      // Xác nhận studentFlow2 vẫn có thể tiếp tục tạo attempt part_practice khác
      // Trước tiên abandon attempt hiện tại để tránh Single Active Attempt
      currentUser = studentFlow2;
      await request(app.getHttpServer())
        .post(`/api/v1/exam-attempts/${partAttemptId}/abandon`)
        .expect(200);

      // Tạo tiếp Part Practice thứ 2 -> Thành công 201 Created (không chạm limit)
      const res = await request(app.getHttpServer())
        .post('/api/v1/exam-attempts')
        .send({
          examId: fullExamId,
          mode: PartPracticeMode.PART_PRACTICE,
          selectedParts: [5],
        })
        .expect(201);

      expect(res.body.attemptId).toBeDefined();

      // Dọn dẹp attempt để kết thúc Flow 2
      await request(app.getHttpServer())
        .post(`/api/v1/exam-attempts/${res.body.attemptId}/abandon`)
        .expect(200);
    });
  });

  // =========================================================================
  // FLOW 3: Single Active Attempt Invariant & Manual Confirmation
  // =========================================================================
  describe('Flow 3: Single Active Attempt Invariant & Manual Confirmation (UC20)', () => {
    let activeAttemptId: string;

    it('3.1 Khởi tạo lượt thi đầu tiên trên Exam A -> 201 Created', async () => {
      currentUser = studentFlow3;
      const res = await request(app.getHttpServer())
        .post('/api/v1/exam-attempts')
        .send({
          examId: fullExamId,
          mode: PartPracticeMode.FULL_EXAM,
        })
        .expect(201);

      expect(res.body.attemptId).toBeDefined();
      expect(res.body.isResumed).toBe(false);
      activeAttemptId = res.body.attemptId;
    });

    it('3.2 Thử tạo lại trên CHÍNH đề Exam A -> 200 OK kèm isResumed: true (PMR 021)', async () => {
      currentUser = studentFlow3;
      const res = await request(app.getHttpServer())
        .post('/api/v1/exam-attempts')
        .send({
          examId: fullExamId,
          mode: PartPracticeMode.FULL_EXAM,
        })
        .expect(200);

      expect(res.body.attemptId).toBe(activeAttemptId);
      expect(res.body.isResumed).toBe(true);
    });

    it('3.3 Thử tạo lượt thi trên ĐỀ THI KHÁC (Exam B) -> Bị chặn 409 Conflict (ERR_ANOTHER_EXAM_IN_PROGRESS)', async () => {
      currentUser = studentFlow3;
      const res = await request(app.getHttpServer())
        .post('/api/v1/exam-attempts')
        .send({
          examId: anotherExamId,
          mode: PartPracticeMode.FULL_EXAM,
        })
        .expect(409);

      expect(res.body.errorCode).toBe('ERR_ANOTHER_EXAM_IN_PROGRESS');
      expect(res.body.attemptId).toBe(activeAttemptId);
      expect(res.body.examTitle).toBe('TEST_SPR6_Full_Exam_01');
    });

    it('3.4 Hủy bài thi cũ dở dang qua POST /abandon -> 200 OK, giải phóng Partial Unique Index', async () => {
      currentUser = studentFlow3;
      const res = await request(app.getHttpServer())
        .post(`/api/v1/exam-attempts/${activeAttemptId}/abandon`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.abandonedAt).toBeDefined();

      // Kiểm tra trạng thái trong CSDL
      const qr = dataSource.createQueryRunner();
      await qr.connect();
      try {
        const rows = await qr.query(`SELECT status FROM exam_attempts WHERE id = $1`, [
          activeAttemptId,
        ]);
        expect(rows[0].status).toBe(ExamAttemptStatus.ABANDONED);
      } finally {
        await qr.release();
      }
    });

    it('3.5 Sau khi hủy, bắt đầu lượt thi mới trên Exam B -> Thành công 201 Created', async () => {
      currentUser = studentFlow3;
      const res = await request(app.getHttpServer())
        .post('/api/v1/exam-attempts')
        .send({
          examId: anotherExamId,
          mode: PartPracticeMode.FULL_EXAM,
        })
        .expect(201);

      expect(res.body.attemptId).toBeDefined();
      expect(res.body.examId).toBe(anotherExamId);

      // Dọn dẹp để kết thúc Flow 3
      await request(app.getHttpServer())
        .post(`/api/v1/exam-attempts/${res.body.attemptId}/abandon`)
        .expect(200);
    });
  });

  // =========================================================================
  // FLOW 4: Network Outage Recovery & Batch Save Pre-validation
  // =========================================================================
  describe('Flow 4: Network Outage Recovery & Batch Save Pre-validation (UC22)', () => {
    let attemptId: string;
    let questionsList: any[] = [];

    it('4.1 Khởi tạo lượt thi cho studentFlow4', async () => {
      currentUser = studentFlow4;
      const res = await request(app.getHttpServer())
        .post('/api/v1/exam-attempts')
        .send({
          examId: fullExamId,
          mode: PartPracticeMode.FULL_EXAM,
        })
        .expect(201);

      attemptId = res.body.attemptId;

      // Lấy danh sách câu hỏi
      const qRes = await request(app.getHttpServer())
        .get(`/api/v1/exam-attempts/${attemptId}/questions`)
        .expect(200);

      questionsList = qRes.body.questions;
      expect(questionsList.length).toBeGreaterThanOrEqual(3);
    });

    it('4.2 Gửi Batch Save gồm 3 câu hợp lệ + 1 câu lỗi ID -> In-memory Pre-validation tách đúng mà không rollback (PMR 019)', async () => {
      currentUser = studentFlow4;

      const q1 = questionsList[0];
      const q2 = questionsList[1];
      const q3 = questionsList[2];

      const batchPayload = {
        answers: [
          {
            questionId: q1.id,
            selectedOptionId: q1.options[0].id,
            isMarkedForReview: false,
            timeSpentSeconds: 10,
            clientAnsweredAt: new Date(Date.now() - 30000).toISOString(),
          },
          {
            questionId: q2.id,
            selectedOptionId: q2.options[1].id,
            isMarkedForReview: true,
            timeSpentSeconds: 12,
            clientAnsweredAt: new Date(Date.now() - 20000).toISOString(),
          },
          {
            questionId: q3.id,
            selectedOptionId: null, // explicit uncheck
            isMarkedForReview: true,
            timeSpentSeconds: 5,
          },
          {
            questionId: '20000000-0000-4000-8000-000000000099', // Câu hỏi giả mạo không có trong snapshot
            selectedOptionId: '30000000-0000-4000-8000-000000000099',
          },
        ],
      };

      const res = await request(app.getHttpServer())
        .put(`/api/v1/exam-attempts/${attemptId}/answers/batch`)
        .send(batchPayload)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.syncedCount).toBe(3);
      expect(res.body.failedCount).toBe(1);
      expect(res.body.failedItems.length).toBe(1);
      expect(res.body.failedItems[0].questionId).toBe('20000000-0000-4000-8000-000000000099');
      expect(res.body.failedItems[0].reason).toBe('ERR_QUESTION_NOT_IN_ATTEMPT');

      // 2 câu có selectedOptionId hợp lệ (câu q3 gửi null nên không tính answered) => answeredCount = 2
      expect(res.body.answeredCount).toBe(2);
    });

    it('4.3 An ninh bài thi (PMR 023): Thí sinh khác hoặc Admin không được phép lưu đáp án thay thí sinh', async () => {
      // 1. Thí sinh khác gọi -> 403 Forbidden
      currentUser = studentFlow1;
      await request(app.getHttpServer())
        .put(`/api/v1/exam-attempts/${attemptId}/answers`)
        .send({
          questionId: questionsList[0].id,
          selectedOptionId: questionsList[0].options[0].id,
        })
        .expect(403);

      // 2. Admin gọi -> 403 Forbidden (PMR 023)
      currentUser = adminUser;
      await request(app.getHttpServer())
        .put(`/api/v1/exam-attempts/${attemptId}/answers`)
        .send({
          questionId: questionsList[0].id,
          selectedOptionId: questionsList[0].options[0].id,
        })
        .expect(403);
    });
  });

  // =========================================================================
  // FLOW 5: Deadline Enforcement, Grace Period & Smooth Timeout
  // =========================================================================
  describe('Flow 5: Deadline Enforcement, Grace Period & Smooth Timeout (UC21, UC22)', () => {
    let attemptId: string;
    let questionId: string;
    let optionId: string;

    it('5.1 Khởi tạo lượt thi cho studentFlow5 và lưu đáp án khi còn thời gian', async () => {
      currentUser = studentFlow5;
      const res = await request(app.getHttpServer())
        .post('/api/v1/exam-attempts')
        .send({
          examId: fullExamId,
          mode: PartPracticeMode.FULL_EXAM,
        })
        .expect(201);

      attemptId = res.body.attemptId;

      const qRes = await request(app.getHttpServer())
        .get(`/api/v1/exam-attempts/${attemptId}/questions`)
        .expect(200);

      questionId = qRes.body.questions[0].id;
      optionId = qRes.body.questions[0].options[0].id;

      // Lưu đáp án hợp lệ trong hạn giờ -> 200 OK
      await request(app.getHttpServer())
        .put(`/api/v1/exam-attempts/${attemptId}/answers`)
        .send({
          questionId,
          selectedOptionId: optionId,
        })
        .expect(200);
    });

    it('5.2 Giả lập hết giờ bền vững qua SQL update expires_at = NOW() - INTERVAL 60 SECONDS (PMR 024)', async () => {
      const qr = dataSource.createQueryRunner();
      await qr.connect();
      try {
        await qr.query(
          `UPDATE exam_attempts
           SET started_at = NOW() - INTERVAL '130 MINUTES',
               expires_at = NOW() - INTERVAL '60 SECONDS'
           WHERE id = $1`,
          [attemptId],
        );
      } finally {
        await qr.release();
      }
    });

    it('5.3 Sau khi quá 30s Grace Period: Lưu đáp án đơn lẻ bị chặn 400 ERR_ATTEMPT_EXPIRED', async () => {
      currentUser = studentFlow5;
      const res = await request(app.getHttpServer())
        .put(`/api/v1/exam-attempts/${attemptId}/answers`)
        .send({
          questionId,
          selectedOptionId: optionId,
        })
        .expect(400);

      expect(res.body.errorCode).toBe('ERR_ATTEMPT_EXPIRED');
    });

    it('5.4 Sau khi quá 30s Grace Period: Lưu đáp án batch cũng bị chặn 400 ERR_ATTEMPT_EXPIRED', async () => {
      currentUser = studentFlow5;
      const res = await request(app.getHttpServer())
        .put(`/api/v1/exam-attempts/${attemptId}/answers/batch`)
        .send({
          answers: [
            {
              questionId,
              selectedOptionId: optionId,
            },
          ],
        })
        .expect(400);

      expect(res.body.errorCode).toBe('ERR_ATTEMPT_EXPIRED');
    });

    it('5.5 Quá hạn làm bài: Overview vẫn trả về 200 OK (Smooth Timeout) với isExpired: true, remainingSeconds: 0', async () => {
      currentUser = studentFlow5;
      const res = await request(app.getHttpServer())
        .get(`/api/v1/exam-attempts/${attemptId}`)
        .expect(200);

      expect(res.body.id).toBe(attemptId);
      expect(res.body.isExpired).toBe(true);
      expect(res.body.remainingSeconds).toBe(0);
      expect(res.body.serverTimeNow).toBeDefined();
    });
  });
});
