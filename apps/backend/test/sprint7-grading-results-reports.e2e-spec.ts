import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { UserRole } from '../src/common/enums/user-role.enum';
import { UserStatus } from '../src/common/enums/user-status.enum';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { PolicyThrottlerGuard } from '../src/common/rate-limit/guards/policy-throttler.guard';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { ExamAttemptStatus } from '../src/modules/exam-attempts/enums/exam-attempt-status.enum';
import { PartPracticeMode } from '../src/modules/exam-attempts/enums/part-practice-mode.enum';
import { ExamAttemptsSubmissionService } from '../src/modules/exam-attempts/services/exam-attempts-submission.service';
import { ExamStatus } from '../src/modules/exams/enums/exam-status.enum';
import { ExamType } from '../src/modules/exams/enums/exam-type.enum';
import { ScoreConversionType } from '../src/modules/exams/enums/score-conversion-type.enum';
import { QuestionReportReason } from '../src/modules/question-reports/enums/question-report-reason.enum';
import { QuestionReportStatus } from '../src/modules/question-reports/enums/question-report-status.enum';
import { QuestionStatus } from '../src/modules/questions/enums/question-status.enum';
import { QuestionType } from '../src/modules/questions/enums/question-type.enum';

describe('Sprint 7 Grading, Results & Question Reports Comprehensive E2E (e2e)', () => {
  jest.setTimeout(60000);

  let app: INestApplication;
  let dataSource: DataSource;
  let submissionService: ExamAttemptsSubmissionService;

  const teacherUser = {
    id: '77770000-0000-4000-8000-000000000001',
    sessionId: 'spr7-sess-teacher',
    email: 'spr7.e2e.teacher@example.com',
    role: UserRole.TEACHER,
    status: UserStatus.ACTIVE,
  };

  const adminUser = {
    id: '77770000-0000-4000-8000-000000000002',
    sessionId: 'spr7-sess-admin',
    email: 'spr7.e2e.admin@example.com',
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
  };

  const studentFlow1 = {
    id: '77770000-0000-4000-8000-000000000011',
    sessionId: 'spr7-sess-stu1',
    email: 'spr7.e2e.student1@example.com',
    role: UserRole.STUDENT,
    status: UserStatus.ACTIVE,
  };

  const studentFlow2 = {
    id: '77770000-0000-4000-8000-000000000012',
    sessionId: 'spr7-sess-stu2',
    email: 'spr7.e2e.student2@example.com',
    role: UserRole.STUDENT,
    status: UserStatus.ACTIVE,
  };

  const studentFlow3 = {
    id: '77770000-0000-4000-8000-000000000013',
    sessionId: 'spr7-sess-stu3',
    email: 'spr7.e2e.student3@example.com',
    role: UserRole.STUDENT,
    status: UserStatus.ACTIVE,
  };

  const studentCron = {
    id: '77770000-0000-4000-8000-000000000014',
    sessionId: 'spr7-sess-stucron',
    email: 'spr7.e2e.student.cron@example.com',
    role: UserRole.STUDENT,
    status: UserStatus.ACTIVE,
  };

  const ALL_TEST_USER_IDS = [
    teacherUser.id,
    adminUser.id,
    studentFlow1.id,
    studentFlow2.id,
    studentFlow3.id,
    studentCron.id,
  ];

  let currentUser = studentFlow1;

  let fullExamId: string;
  let rawPercentageExamId: string;
  let skillIdGrammar: string;

  // Map questionId -> { correctOptionId, wrongOptionId, partNumber, groupId }
  const seededQuestionMeta = new Map<
    string,
    {
      correctOptionId: string;
      wrongOptionId: string;
      partNumber: number;
      groupId: string | null;
    }
  >();

  let flow1AttemptId: string;
  let reportedQuestionId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(PolicyThrottlerGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: {
          switchToHttp: () => { getRequest: () => { user?: unknown } };
        }) => {
          const req = context.switchToHttp().getRequest();
          req.user = currentUser;
          return true;
        },
      })
      .overrideGuard(RolesGuard)
      .useValue({
        canActivate: (context: {
          switchToHttp: () => { getRequest: () => { user?: { role?: UserRole } } };
          getHandler: () => object;
          getClass: () => object;
        }) => {
          const req = context.switchToHttp().getRequest();
          const handler = context.getHandler();
          const classRef = context.getClass();
          const roles =
            (Reflect.getMetadata('roles', handler) as UserRole[] | undefined) ||
            (Reflect.getMetadata('roles', classRef) as UserRole[] | undefined);
          if (!roles || roles.length === 0) return true;
          return Boolean(req.user?.role && roles.includes(req.user.role));
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
    submissionService = app.get(ExamAttemptsSubmissionService);

    await cleanupTestData();
    await setupTestFixtures();
  });

  afterAll(async () => {
    await cleanupTestData();
    if (app) {
      await app.close();
    }
  });

  async function cleanupTestData(): Promise<void> {
    if (!dataSource || !dataSource.isInitialized) return;
    const qr = dataSource.createQueryRunner();
    await qr.connect();
    try {
      // 1. Delete question_reports first (RESTRICT on question_id & reporter_id - PMR 032)
      await qr.query(
        `DELETE FROM question_reports
         WHERE reporter_id = ANY($1)
            OR question_id IN (SELECT id FROM questions WHERE explanation LIKE 'TEST_SPR7_%')`,
        [ALL_TEST_USER_IDS],
      );

      // 2. Delete exam_attempt_answers & snapshots & attempts
      await qr.query(
        `DELETE FROM exam_attempt_answers
         WHERE attempt_id IN (
           SELECT id FROM exam_attempts
           WHERE user_id = ANY($1)
              OR exam_id IN (SELECT id FROM exams WHERE title LIKE 'TEST_SPR7_%')
         )`,
        [ALL_TEST_USER_IDS],
      );
      await qr.query(
        `DELETE FROM exam_attempt_snapshots
         WHERE attempt_id IN (
           SELECT id FROM exam_attempts
           WHERE user_id = ANY($1)
              OR exam_id IN (SELECT id FROM exams WHERE title LIKE 'TEST_SPR7_%')
         )`,
        [ALL_TEST_USER_IDS],
      );
      await qr.query(
        `DELETE FROM exam_attempts
         WHERE user_id = ANY($1)
            OR exam_id IN (SELECT id FROM exams WHERE title LIKE 'TEST_SPR7_%')`,
        [ALL_TEST_USER_IDS],
      );

      // 3. Delete exam_questions, exam_sections, exams
      await qr.query(
        `DELETE FROM exam_questions WHERE exam_id IN (SELECT id FROM exams WHERE title LIKE 'TEST_SPR7_%')`,
      );
      await qr.query(
        `DELETE FROM exam_sections WHERE exam_id IN (SELECT id FROM exams WHERE title LIKE 'TEST_SPR7_%')`,
      );
      await qr.query(`DELETE FROM exams WHERE title LIKE 'TEST_SPR7_%'`);

      // 4. Delete media_resources, question_options, question_skills, questions, question_groups
      await qr.query(
        `DELETE FROM media_resources
         WHERE question_id IN (SELECT id FROM questions WHERE explanation LIKE 'TEST_SPR7_%')
            OR question_group_id IN (SELECT id FROM question_groups WHERE title LIKE 'TEST_SPR7_%')`,
      );
      await qr.query(
        `DELETE FROM question_options
         WHERE question_id IN (SELECT id FROM questions WHERE explanation LIKE 'TEST_SPR7_%')`,
      );
      await qr.query(
        `DELETE FROM question_skills
         WHERE question_id IN (SELECT id FROM questions WHERE explanation LIKE 'TEST_SPR7_%')`,
      );
      await qr.query(`DELETE FROM questions WHERE explanation LIKE 'TEST_SPR7_%'`);
      await qr.query(`DELETE FROM question_groups WHERE title LIKE 'TEST_SPR7_%'`);
      await qr.query(`DELETE FROM skills WHERE code LIKE 'TEST_SPR7_%'`);

      // 5. Delete test users & profiles
      await qr.query(`DELETE FROM user_profiles WHERE user_id = ANY($1)`, [ALL_TEST_USER_IDS]);
      await qr.query(`DELETE FROM users WHERE id = ANY($1)`, [ALL_TEST_USER_IDS]);
    } finally {
      await qr.release();
    }
  }

  async function setupTestFixtures(): Promise<void> {
    const qr = dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // 1. Seed isolated users
      for (const u of [
        teacherUser,
        adminUser,
        studentFlow1,
        studentFlow2,
        studentFlow3,
        studentCron,
      ]) {
        await qr.query(
          `INSERT INTO users (id, email, password_hash, role, status)
           VALUES ($1, $2, 'hashed_pw', $3, $4)
           ON CONFLICT (id) DO NOTHING`,
          [u.id, u.email, u.role, u.status],
        );
      }

      // 2. Dynamically load toeic_parts (PMR 032)
      const parts: Array<{ id: string; part_number: number }> = await qr.query(
        `SELECT id, part_number FROM toeic_parts ORDER BY part_number ASC`,
      );
      const partMap = new Map<number, string>();
      for (const p of parts) {
        partMap.set(Number(p.part_number), p.id);
      }

      // 3. Create a test Skill for skillBreakdown verification
      const skillRes: Array<{ id: string }> = await qr.query(
        `INSERT INTO skills (id, code, name, description)
         VALUES (gen_random_uuid(), 'TEST_SPR7_GRAMMAR', 'Ngữ pháp TOEIC Sprint 7', 'Kỹ năng test E2E')
         RETURNING id`,
      );
      skillIdGrammar = skillRes[0].id;

      // 4. Create Full Exam (DEFAULT_ETS, passingScore = 300, allowPartPractice = true)
      const fullExamRes: Array<{ id: string }> = await qr.query(
        `INSERT INTO exams (
           id, title, description, type, status, duration_minutes,
           allow_part_practice, max_attempts, score_conversion_type, passing_score,
           is_shuffled_questions, is_shuffled_options, created_by, version, is_deleted
         )
         VALUES (
           gen_random_uuid(), 'TEST_SPR7_Full_Exam_ETS', 'Đề thi E2E Sprint 7 DEFAULT_ETS',
           $1, $2, 120, true, 5, $3, 300, true, true, $4, 1, false
         )
         RETURNING id`,
        [ExamType.FULL_TEST, ExamStatus.PUBLISHED, ScoreConversionType.DEFAULT_ETS, teacherUser.id],
      );
      fullExamId = fullExamRes[0].id;

      // 5. Create RAW_PERCENTAGE Exam (passingScore = 50)
      const rawExamRes: Array<{ id: string }> = await qr.query(
        `INSERT INTO exams (
           id, title, description, type, status, duration_minutes,
           allow_part_practice, max_attempts, score_conversion_type, passing_score,
           is_shuffled_questions, is_shuffled_options, created_by, version, is_deleted
         )
         VALUES (
           gen_random_uuid(), 'TEST_SPR7_Raw_Percentage_Exam', 'Đề thi E2E Sprint 7 RAW_PERCENTAGE',
           $1, $2, 60, true, 5, $3, 50, false, false, $4, 1, false
         )
         RETURNING id`,
        [
          ExamType.MINI_TEST,
          ExamStatus.PUBLISHED,
          ScoreConversionType.RAW_PERCENTAGE,
          teacherUser.id,
        ],
      );
      rawPercentageExamId = rawExamRes[0].id;

      // 6. Seed sections & questions for fullExam:
      // Part 1 (1 question, content: null per Rule #1002)
      // Part 3 (2 questions in Group G3)
      // Part 5 (2 questions attached to Skill TEST_SPR7_GRAMMAR)
      // Part 7 (1 question in Group G7)
      // Total = 6 questions (3 Listening, 3 Reading)
      const partPlan: Array<{
        partNumber: number;
        count: number;
        isGroup: boolean;
        nullableContent?: boolean;
        attachSkill?: boolean;
      }> = [
        { partNumber: 1, count: 1, isGroup: false, nullableContent: true },
        { partNumber: 3, count: 2, isGroup: true },
        { partNumber: 5, count: 2, isGroup: false, attachSkill: true },
        { partNumber: 7, count: 1, isGroup: true },
      ];

      let orderIdx = 1;
      for (const item of partPlan) {
        const partId = partMap.get(item.partNumber)!;
        const secRes: Array<{ id: string }> = await qr.query(
          `INSERT INTO exam_sections (id, exam_id, part_id, target_questions_count, target_duration_minutes)
           VALUES (gen_random_uuid(), $1, $2, $3, 15)
           RETURNING id`,
          [fullExamId, partId, item.count],
        );
        const sectionId = secRes[0].id;

        let groupId: string | null = null;
        if (item.isGroup) {
          const gRes: Array<{ id: string }> = await qr.query(
            `INSERT INTO question_groups (id, title, context, created_by)
             VALUES (gen_random_uuid(), $1, $2, $3)
             RETURNING id`,
            [
              `TEST_SPR7_Group_Part_${item.partNumber}`,
              `TEST_SPR7_Transcript_Or_Passage_Part_${item.partNumber}`,
              teacherUser.id,
            ],
          );
          groupId = gRes[0].id;
        }

        for (let i = 1; i <= item.count; i++) {
          const qContent = item.nullableContent
            ? null
            : `TEST_SPR7_Question_P${item.partNumber}_${i}`;
          const qRes: Array<{ id: string }> = await qr.query(
            `INSERT INTO questions (
               id, content, question_type, status, part_id,
               created_by, question_group_id, group_order, explanation, version
             )
             VALUES (
               gen_random_uuid(), $1, $2, $3, $4,
               $5, $6, $7, $8, 1
             )
             RETURNING id`,
            [
              qContent,
              QuestionType.SINGLE_CHOICE,
              QuestionStatus.PUBLISHED,
              partId,
              teacherUser.id,
              groupId,
              item.isGroup ? i : null,
              `TEST_SPR7_EXP_P${item.partNumber}_${i}`,
            ],
          );
          const qId = qRes[0].id;

          if (!reportedQuestionId && item.partNumber === 1) {
            reportedQuestionId = qId;
          }

          if (item.attachSkill) {
            await qr.query(`INSERT INTO question_skills (question_id, skill_id) VALUES ($1, $2)`, [
              qId,
              skillIdGrammar,
            ]);
          }

          // Create 4 options (A is correct, B..D are wrong; Part 1 options have content: null per Rule #1002)
          let correctOptionId = '';
          let wrongOptionId = '';
          const labels = ['A', 'B', 'C', 'D'];
          for (let pos = 1; pos <= 4; pos++) {
            const isCorrect = pos === 1;
            const optContent = item.nullableContent
              ? null
              : `Option ${labels[pos - 1]} for Q${orderIdx}`;
            const optRes: Array<{ id: string }> = await qr.query(
              `INSERT INTO question_options (id, question_id, label, content, is_correct, position)
               VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
               RETURNING id`,
              [qId, labels[pos - 1], optContent, isCorrect, pos],
            );
            if (isCorrect) correctOptionId = optRes[0].id;
            if (pos === 2) wrongOptionId = optRes[0].id;
          }

          seededQuestionMeta.set(qId, {
            correctOptionId,
            wrongOptionId,
            partNumber: item.partNumber,
            groupId,
          });

          await qr.query(
            `INSERT INTO exam_questions (id, exam_id, exam_section_id, question_id, question_group_id, order_index, group_order)
             VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)`,
            [fullExamId, sectionId, qId, groupId, orderIdx, item.isGroup ? i : null],
          );

          // Also link Part 5 questions into rawPercentageExamId for Flow 3
          if (item.partNumber === 5) {
            let rawSectionId: string;
            const existingRawSec: Array<{ id: string }> = await qr.query(
              `SELECT id FROM exam_sections WHERE exam_id = $1 AND part_id = $2`,
              [rawPercentageExamId, partId],
            );
            if (existingRawSec.length === 0) {
              const newSec: Array<{ id: string }> = await qr.query(
                `INSERT INTO exam_sections (id, exam_id, part_id, target_questions_count, target_duration_minutes)
                 VALUES (gen_random_uuid(), $1, $2, 2, 10)
                 RETURNING id`,
                [rawPercentageExamId, partId],
              );
              rawSectionId = newSec[0].id;
            } else {
              rawSectionId = existingRawSec[0].id;
            }

            await qr.query(
              `INSERT INTO exam_questions (id, exam_id, exam_section_id, question_id, question_group_id, order_index, group_order)
               VALUES (gen_random_uuid(), $1, $2, $3, NULL, $4, NULL)`,
              [rawPercentageExamId, rawSectionId, qId, i],
            );
          }

          orderIdx++;
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

  // =========================================================================
  // FLOW 1: Luồng MVP Cốt Lõi Khép Kín (Full Exam DEFAULT_ETS -> Submit -> Result -> History -> Review)
  // =========================================================================
  describe('Flow 1: Luồng MVP Cốt Lõi Khép Kín (UC23, UC25, UC26, UC27, UC28)', () => {
    it('1.1 Học viên 1 bắt đầu Full Exam, lưu câu đúng/sai/review-only/skipped và nộp bài thủ công (UC23 & UC25)', async () => {
      currentUser = studentFlow1;

      const startRes = await request(app.getHttpServer())
        .post('/api/v1/exam-attempts')
        .send({
          examId: fullExamId,
          mode: PartPracticeMode.FULL_EXAM,
        })
        .expect(201);

      flow1AttemptId = startRes.body.attemptId;
      expect(flow1AttemptId).toBeDefined();
      expect(startRes.body.totalQuestions).toBe(6);

      // Answer plan across the 6 questions:
      // - Part 1 Q (1 question): answer CORRECT
      // - Part 3 Q1: answer WRONG + mark for review
      // - Part 3 Q2: review-only skipped (selectedOptionId = null, isMarkedForReview = true)
      // - Part 5 Q1: answer CORRECT
      // - Part 5 Q2: answer CORRECT
      // - Part 7 Q1: completely untouched (skipped, no row in exam_attempt_answers)
      // Summary: correct = 3 (1 Listening, 2 Reading), wrong = 1 (Part 3 Q1), skipped = 2 (Part 3 Q2 + Part 7 Q1), marked = 2
      const part3Questions: string[] = [];
      for (const [qId, meta] of seededQuestionMeta.entries()) {
        if (meta.partNumber === 1) {
          await request(app.getHttpServer())
            .put(`/api/v1/exam-attempts/${flow1AttemptId}/answers`)
            .send({
              questionId: qId,
              selectedOptionId: meta.correctOptionId,
              timeSpentSeconds: 15,
            })
            .expect(200);
        } else if (meta.partNumber === 3) {
          part3Questions.push(qId);
        } else if (meta.partNumber === 5) {
          await request(app.getHttpServer())
            .put(`/api/v1/exam-attempts/${flow1AttemptId}/answers`)
            .send({
              questionId: qId,
              selectedOptionId: meta.correctOptionId,
              timeSpentSeconds: 20,
            })
            .expect(200);
        }
      }

      // Part 3 Q1 -> WRONG + marked
      const p3q1Meta = seededQuestionMeta.get(part3Questions[0])!;
      await request(app.getHttpServer())
        .put(`/api/v1/exam-attempts/${flow1AttemptId}/answers`)
        .send({
          questionId: part3Questions[0],
          selectedOptionId: p3q1Meta.wrongOptionId,
          isMarkedForReview: true,
          timeSpentSeconds: 30,
        })
        .expect(200);

      // Part 3 Q2 -> Review-only skipped (selectedOptionId: null, isMarkedForReview: true)
      await request(app.getHttpServer())
        .put(`/api/v1/exam-attempts/${flow1AttemptId}/answers`)
        .send({
          questionId: part3Questions[1],
          selectedOptionId: null,
          isMarkedForReview: true,
          timeSpentSeconds: 10,
        })
        .expect(200);

      // Submit attempt (UC23)
      const submitRes = await request(app.getHttpServer())
        .post(`/api/v1/exam-attempts/${flow1AttemptId}/submit`)
        .expect(200);

      expect(submitRes.body).toMatchObject({
        attemptId: flow1AttemptId,
        status: ExamAttemptStatus.SUBMITTED,
        totalQuestions: 6,
        correctCount: 3,
        wrongCount: 1,
        skippedCount: 2,
        accuracyPercentage: 50,
      });
      expect(submitRes.body.listeningScore).toBeGreaterThanOrEqual(5);
      expect(submitRes.body.readingScore).toBeGreaterThanOrEqual(5);
      expect(submitRes.body.totalScore).toBe(
        submitRes.body.listeningScore + submitRes.body.readingScore,
      );
      expect(typeof submitRes.body.isPassed).toBe('boolean');
    });

    it('1.2 Xem kết quả tổng quan (UC26) kể cả khi đề gốc bị xóa mềm (is_deleted = true)', async () => {
      currentUser = studentFlow1;

      const resultRes = await request(app.getHttpServer())
        .get(`/api/v1/exam-attempts/${flow1AttemptId}/result`)
        .expect(200);

      expect(resultRes.body).toMatchObject({
        attemptId: flow1AttemptId,
        examId: fullExamId,
        examTitle: 'TEST_SPR7_Full_Exam_ETS',
        mode: PartPracticeMode.FULL_EXAM,
        selectedParts: null,
        scoreConversionType: ScoreConversionType.DEFAULT_ETS,
        status: ExamAttemptStatus.SUBMITTED,
        totalQuestions: 6,
        correctCount: 3,
        wrongCount: 1,
        skippedCount: 2,
        accuracyPercentage: 50,
        passingScore: 300,
      });
      expect(resultRes.body.partBreakdown.map((p: { partNumber: number }) => p.partNumber)).toEqual(
        [1, 3, 5, 7],
      );
      expect(resultRes.body.skillBreakdown).toEqual([
        expect.objectContaining({
          skillId: skillIdGrammar,
          skillCode: 'TEST_SPR7_GRAMMAR',
          total: 2,
          correct: 2,
          wrong: 0,
          skipped: 0,
          accuracy: 100,
        }),
      ]);

      // Soft-delete the exam and verify /result and /history still work (PMR 027)
      await dataSource.query(`UPDATE exams SET is_deleted = true WHERE id = $1`, [fullExamId]);
      try {
        const softDeletedResult = await request(app.getHttpServer())
          .get(`/api/v1/exam-attempts/${flow1AttemptId}/result`)
          .expect(200);
        expect(softDeletedResult.body.examTitle).toBe('TEST_SPR7_Full_Exam_ETS');
      } finally {
        await dataSource.query(`UPDATE exams SET is_deleted = false WHERE id = $1`, [fullExamId]);
      }
    });

    it('1.3 Xem lịch sử làm bài phân trang phẳng & kiểm tra bộ lọc ngày (UC27)', async () => {
      currentUser = studentFlow1;

      const historyRes = await request(app.getHttpServer())
        .get('/api/v1/exam-attempts/history')
        .query({
          page: 1,
          limit: 10,
          examId: fullExamId,
          mode: PartPracticeMode.FULL_EXAM,
          status: ExamAttemptStatus.SUBMITTED,
          fromDate: '2020-01-01',
          toDate: '2099-12-31',
        })
        .expect(200);

      expect(historyRes.body.total).toBe(1);
      expect(historyRes.body.items[0]).toMatchObject({
        attemptId: flow1AttemptId,
        examId: fullExamId,
        examTitle: 'TEST_SPR7_Full_Exam_ETS',
        status: ExamAttemptStatus.SUBMITTED,
        correctCount: 3,
        totalQuestions: 6,
        accuracyPercentage: 50,
      });
      // JSONB breakdown columns must NOT be present in history items
      expect(historyRes.body.items[0]).not.toHaveProperty('partBreakdown');
      expect(historyRes.body.items[0]).not.toHaveProperty('skillBreakdown');

      // Invalid date range -> 400 ERR_INVALID_DATE_RANGE
      const badDateRes = await request(app.getHttpServer())
        .get('/api/v1/exam-attempts/history')
        .query({
          fromDate: '2026-12-01',
          toDate: '2026-11-01',
        })
        .expect(400);
      expect(badDateRes.body.errorCode).toBe('ERR_INVALID_DATE_RANGE');
    });

    it('1.4 Xem lời giải chi tiết, kiểm tra filterCounts, tách biệt wrong vs skipped, bảo toàn thứ tự options A–D và deduplicate questionGroups SAU KHI lọc (UC28)', async () => {
      currentUser = studentFlow1;

      // Filter = wrong across all parts
      const wrongReviewRes = await request(app.getHttpServer())
        .get(`/api/v1/exam-attempts/${flow1AttemptId}/review`)
        .query({ filter: 'wrong' })
        .expect(200);

      expect(wrongReviewRes.body.filterCounts).toEqual({
        all: 6,
        correct: 3,
        wrong: 1,
        skipped: 2,
        marked: 2,
      });

      // Only the 1 wrong Part 3 question should be returned (NOT the review-only skipped question!)
      expect(wrongReviewRes.body.questions).toHaveLength(1);
      expect(wrongReviewRes.body.questions[0].partNumber).toBe(3);
      expect(wrongReviewRes.body.questions[0].isCorrect).toBe(false);
      expect(wrongReviewRes.body.questions[0].selectedOptionId).not.toBeNull();
      expect(
        wrongReviewRes.body.questions[0].options.map((o: { label: string }) => o.label),
      ).toEqual(['A', 'B', 'C', 'D']);

      // Post-filter deduplication: only Part 3's group is returned, NOT Part 7's group!
      expect(wrongReviewRes.body.questionGroups).toHaveLength(1);
      expect(wrongReviewRes.body.questionGroups[0].title).toBe('TEST_SPR7_Group_Part_3');
      expect(wrongReviewRes.body.questionGroups[0].transcript).toBe(
        'TEST_SPR7_Transcript_Or_Passage_Part_3',
      );

      // Part 1 review: verify Rule #1002 nullable content on question and options
      const part1ReviewRes = await request(app.getHttpServer())
        .get(`/api/v1/exam-attempts/${flow1AttemptId}/review`)
        .query({ partNumber: 1, filter: 'all' })
        .expect(200);

      expect(part1ReviewRes.body.filterCounts).toEqual({
        all: 1,
        correct: 1,
        wrong: 0,
        skipped: 0,
        marked: 0,
      });
      expect(part1ReviewRes.body.questions[0].content).toBeNull();
      expect(part1ReviewRes.body.questions[0].options[0].content).toBeNull();
    });
  });

  // =========================================================================
  // FLOW 2: Chống Nộp Đúp (409), Lượt Thi Đã Hủy (400), Quá Hạn 30s & Cronjob UC24
  // =========================================================================
  describe('Flow 2: Chống Nộp Đúp, Lượt Thi Bị Hủy, Quá Hạn 30s & Cronjob Tự Động Thu Bài (UC23 & UC24)', () => {
    it('2.1 Chặn nộp bài 2 lần liên tiếp (409 ERR_ATTEMPT_ALREADY_SUBMITTED) và chặn nộp hộ (403 ERR_FORBIDDEN_ATTEMPT_ACCESS)', async () => {
      currentUser = studentFlow1;

      const dupRes = await request(app.getHttpServer())
        .post(`/api/v1/exam-attempts/${flow1AttemptId}/submit`)
        .expect(409);

      expect(dupRes.body).toMatchObject({
        errorCode: 'ERR_ATTEMPT_ALREADY_SUBMITTED',
        status: ExamAttemptStatus.SUBMITTED,
      });
      expect(dupRes.body.submittedAt).toBeDefined();

      // Another student tries to submit studentFlow1's attempt -> 403
      currentUser = studentFlow2;
      const forbiddenRes = await request(app.getHttpServer())
        .post(`/api/v1/exam-attempts/${flow1AttemptId}/submit`)
        .expect(403);
      expect(forbiddenRes.body.errorCode).toBe('ERR_FORBIDDEN_ATTEMPT_ACCESS');
    });

    it('2.2 Chặn nộp lượt thi đã hủy (400 ERR_ATTEMPT_NOT_IN_PROGRESS) và chuyển timed_out khi nộp sau expires_at + 30s', async () => {
      currentUser = studentFlow2;

      // 1. Start and abandon attempt -> submit returns 400
      const startAbandonRes = await request(app.getHttpServer())
        .post('/api/v1/exam-attempts')
        .send({ examId: fullExamId, mode: PartPracticeMode.FULL_EXAM })
        .expect(201);
      const abandonedAttemptId = startAbandonRes.body.attemptId;

      await request(app.getHttpServer())
        .post(`/api/v1/exam-attempts/${abandonedAttemptId}/abandon`)
        .expect(200);

      const submitAbandonedRes = await request(app.getHttpServer())
        .post(`/api/v1/exam-attempts/${abandonedAttemptId}/submit`)
        .expect(400);
      expect(submitAbandonedRes.body.errorCode).toBe('ERR_ATTEMPT_NOT_IN_PROGRESS');

      // 2. Start another attempt, rewind expires_at past 30s grace period, and submit -> timed_out with capped durationSpentSeconds
      const startLateRes = await request(app.getHttpServer())
        .post('/api/v1/exam-attempts')
        .send({ examId: fullExamId, mode: PartPracticeMode.FULL_EXAM })
        .expect(201);
      const lateAttemptId = startLateRes.body.attemptId;

      await dataSource.query(
        `UPDATE exam_attempts
         SET started_at = NOW() - INTERVAL '7320 seconds',
             expires_at = NOW() - INTERVAL '120 seconds'
         WHERE id = $1`,
        [lateAttemptId],
      );

      const lateSubmitRes = await request(app.getHttpServer())
        .post(`/api/v1/exam-attempts/${lateAttemptId}/submit`)
        .expect(200);

      expect(lateSubmitRes.body.status).toBe(ExamAttemptStatus.TIMED_OUT);
      // Allocated seconds = 7200, so durationSpentSeconds must be capped at 7200
      expect(lateSubmitRes.body.durationSpentSeconds).toBe(7200);
    });

    it('2.3 Cronjob handleAutoSubmitExpiredAttempts (UC24) tự động thu bài quá hạn expires_at + 30s với FOR UPDATE SKIP LOCKED', async () => {
      currentUser = studentCron;

      const startCronRes = await request(app.getHttpServer())
        .post('/api/v1/exam-attempts')
        .send({ examId: fullExamId, mode: PartPracticeMode.FULL_EXAM })
        .expect(201);
      const cronAttemptId = startCronRes.body.attemptId;

      // Move expires_at to 90s in the past (> 30s grace period)
      await dataSource.query(
        `UPDATE exam_attempts
         SET started_at = NOW() - INTERVAL '7290 seconds',
             expires_at = NOW() - INTERVAL '90 seconds'
         WHERE id = $1`,
        [cronAttemptId],
      );

      const cronStats = await submissionService.handleAutoSubmitExpiredAttempts();
      expect(cronStats.succeeded).toBeGreaterThanOrEqual(1);

      const resultRes = await request(app.getHttpServer())
        .get(`/api/v1/exam-attempts/${cronAttemptId}/result`)
        .expect(200);

      expect(resultRes.body.status).toBe(ExamAttemptStatus.TIMED_OUT);
      expect(resultRes.body.durationSpentSeconds).toBe(7200);
      expect(resultRes.body.gradedAt).toBeDefined();
    });
  });

  // =========================================================================
  // FLOW 3: Đa Chế Độ Chấm Điểm (part_practice & RAW_PERCENTAGE) & Zero Answer Leakage
  // =========================================================================
  describe('Flow 3: Đa Chế Độ Chấm Điểm (part_practice & RAW_PERCENTAGE) & Bảo Mật Zero Answer Leakage', () => {
    it('3.1 Chặn xem /result và /review khi đang in_progress (400 ERR_ATTEMPT_NOT_SUBMITTED) và kiểm chứng part_practice + RAW_PERCENTAGE', async () => {
      currentUser = studentFlow3;

      // 1. Start part_practice (Part 5 only)
      const startPartRes = await request(app.getHttpServer())
        .post('/api/v1/exam-attempts')
        .send({
          examId: fullExamId,
          mode: PartPracticeMode.PART_PRACTICE,
          selectedParts: [5],
        })
        .expect(201);
      const partAttemptId = startPartRes.body.attemptId;

      // Zero Answer Leakage: /result and /review blocked while in_progress
      const leakResultRes = await request(app.getHttpServer())
        .get(`/api/v1/exam-attempts/${partAttemptId}/result`)
        .expect(400);
      expect(leakResultRes.body.errorCode).toBe('ERR_ATTEMPT_NOT_SUBMITTED');

      const leakReviewRes = await request(app.getHttpServer())
        .get(`/api/v1/exam-attempts/${partAttemptId}/review`)
        .expect(400);
      expect(leakReviewRes.body.errorCode).toBe('ERR_ATTEMPT_NOT_SUBMITTED');

      // Submit part_practice -> ETS scores & isPassed must be null
      const submitPartRes = await request(app.getHttpServer())
        .post(`/api/v1/exam-attempts/${partAttemptId}/submit`)
        .expect(200);

      expect(submitPartRes.body.totalScore).toBeNull();
      expect(submitPartRes.body.listeningScore).toBeNull();
      expect(submitPartRes.body.readingScore).toBeNull();
      expect(submitPartRes.body.isPassed).toBeNull();

      // Requesting Part 7 on a Part 5 practice review -> 400 ERR_PART_NOT_IN_ATTEMPT
      const badPartReview = await request(app.getHttpServer())
        .get(`/api/v1/exam-attempts/${partAttemptId}/review`)
        .query({ partNumber: 7 })
        .expect(400);
      expect(badPartReview.body.errorCode).toBe('ERR_PART_NOT_IN_ATTEMPT');

      // 2. Start and submit RAW_PERCENTAGE exam
      const startRawRes = await request(app.getHttpServer())
        .post('/api/v1/exam-attempts')
        .send({
          examId: rawPercentageExamId,
          mode: PartPracticeMode.FULL_EXAM,
        })
        .expect(201);
      const rawAttemptId = startRawRes.body.attemptId;

      // Answer 1 of 2 Part 5 questions correctly -> 50% accuracy >= passingScore 50 -> isPassed = true
      const p5Entries = Array.from(seededQuestionMeta.entries()).filter(
        ([, m]) => m.partNumber === 5,
      );
      await request(app.getHttpServer())
        .put(`/api/v1/exam-attempts/${rawAttemptId}/answers`)
        .send({
          questionId: p5Entries[0][0],
          selectedOptionId: p5Entries[0][1].correctOptionId,
        })
        .expect(200);

      const submitRawRes = await request(app.getHttpServer())
        .post(`/api/v1/exam-attempts/${rawAttemptId}/submit`)
        .expect(200);

      expect(submitRawRes.body.totalScore).toBeNull();
      expect(submitRawRes.body.listeningScore).toBeNull();
      expect(submitRawRes.body.readingScore).toBeNull();
      expect(submitRawRes.body.accuracyPercentage).toBe(50);
      expect(submitRawRes.body.isPassed).toBe(true);
    });
  });

  // =========================================================================
  // FLOW 4: Báo Cáo Câu Hỏi Lỗi & Quy Trình Xử Lý Báo Cáo Hàng Loạt (UC29 & UC49)
  // =========================================================================
  describe('Flow 4: Báo Cáo Câu Hỏi Lỗi & Quy Trình Xử Lý Báo Cáo Khép Kín (UC29 & UC49)', () => {
    let primaryReportId: string;

    it('4.1 Học viên 1 tạo báo cáo lỗi câu hỏi kèm attemptId, chặn chuỗi khoảng trắng và chặn spam báo cáo trùng bằng Partial Unique Index (409 ERR_DUPLICATE_OPEN_REPORT)', async () => {
      currentUser = studentFlow1;

      // 1. Whitespace description when reason=OTHER -> 400
      await request(app.getHttpServer())
        .post(`/api/v1/questions/${reportedQuestionId}/reports`)
        .send({
          reason: QuestionReportReason.OTHER,
          description: '            ',
        })
        .expect(400);

      // 2. Valid report creation with attemptId -> 201 Created
      const createRes = await request(app.getHttpServer())
        .post(`/api/v1/questions/${reportedQuestionId}/reports`)
        .send({
          reason: QuestionReportReason.OTHER,
          description: '   File âm thanh của câu Part 1 bị mất tiếng ở cuối câu.   ',
          attemptId: flow1AttemptId,
        })
        .expect(201);

      primaryReportId = createRes.body.id;
      expect(createRes.body).toMatchObject({
        questionId: reportedQuestionId,
        attemptId: flow1AttemptId,
        reason: QuestionReportReason.OTHER,
        description: 'File âm thanh của câu Part 1 bị mất tiếng ở cuối câu.',
        status: QuestionReportStatus.PENDING,
      });

      // 3. Duplicate open report from same student on same question -> 409 ERR_DUPLICATE_OPEN_REPORT
      const dupReportRes = await request(app.getHttpServer())
        .post(`/api/v1/questions/${reportedQuestionId}/reports`)
        .send({
          reason: QuestionReportReason.BROKEN_MEDIA,
        })
        .expect(409);
      expect(dupReportRes.body.errorCode).toBe('ERR_DUPLICATE_OPEN_REPORT');

      // 4. Student 2 also submits an open report on the same question (for bulk resolution test)
      currentUser = studentFlow2;
      await request(app.getHttpServer())
        .post(`/api/v1/questions/${reportedQuestionId}/reports`)
        .send({
          reason: QuestionReportReason.BROKEN_MEDIA,
          description: 'Audio bị lỗi không nghe được.',
        })
        .expect(201);

      // 5. Student cannot access teacher management list -> 403 Forbidden
      await request(app.getHttpServer()).get('/api/v1/question-reports').expect(403);
    });

    it('4.2 Teacher xem danh sách/chi tiết báo cáo, chuyển in_review (giữ resolvedAt=null), và resolve hàng loạt với resolveAllForQuestion=true (UC49)', async () => {
      currentUser = teacherUser;

      // 1. Management list
      const listRes = await request(app.getHttpServer())
        .get('/api/v1/question-reports')
        .query({ questionId: reportedQuestionId, status: QuestionReportStatus.PENDING })
        .expect(200);
      expect(listRes.body.total).toBe(2);

      // 2. Report detail (verify Rule #1002 nullable content on Part 1 question)
      const detailRes = await request(app.getHttpServer())
        .get(`/api/v1/question-reports/${primaryReportId}`)
        .expect(200);
      expect(detailRes.body.id).toBe(primaryReportId);
      expect(detailRes.body.question.id).toBe(reportedQuestionId);
      expect(detailRes.body.question.content).toBeNull();
      expect(detailRes.body.question.options).toHaveLength(4);

      // 3. Transition pending -> in_review (keeps resolvedById=null, resolvedAt=null)
      const inReviewRes = await request(app.getHttpServer())
        .patch(`/api/v1/question-reports/${primaryReportId}/resolve`)
        .send({
          status: QuestionReportStatus.IN_REVIEW,
        })
        .expect(200);

      expect(inReviewRes.body).toMatchObject({
        id: primaryReportId,
        status: QuestionReportStatus.IN_REVIEW,
        resolvedById: null,
        resolvedAt: null,
        bulkResolvedCount: 0,
      });

      // Calling in_review again while already in_review -> 400 ERR_INVALID_REPORT_STATUS_TRANSITION
      const dupInReviewRes = await request(app.getHttpServer())
        .patch(`/api/v1/question-reports/${primaryReportId}/resolve`)
        .send({
          status: QuestionReportStatus.IN_REVIEW,
        })
        .expect(400);
      expect(dupInReviewRes.body.errorCode).toBe('ERR_INVALID_REPORT_STATUS_TRANSITION');

      // 4. Resolve with resolveAllForQuestion=true -> closes both Student 1 and Student 2 reports
      const resolveRes = await request(app.getHttpServer())
        .patch(`/api/v1/question-reports/${primaryReportId}/resolve`)
        .send({
          status: QuestionReportStatus.RESOLVED,
          resolutionNote: '  Đã thay thế file audio chuẩn cho câu hỏi số 1.  ',
          resolveAllForQuestion: true,
        })
        .expect(200);

      expect(resolveRes.body).toMatchObject({
        id: primaryReportId,
        questionId: reportedQuestionId,
        status: QuestionReportStatus.RESOLVED,
        resolvedById: teacherUser.id,
        resolutionNote: 'Đã thay thế file audio chuẩn cho câu hỏi số 1.',
        bulkResolvedCount: 1,
      });
      expect(resolveRes.body.resolvedAt).toBeDefined();

      // 5. Re-resolving an already closed report -> 400 ERR_REPORT_ALREADY_CLOSED
      const closedRes = await request(app.getHttpServer())
        .patch(`/api/v1/question-reports/${primaryReportId}/resolve`)
        .send({
          status: QuestionReportStatus.REJECTED,
          resolutionNote: 'Thử ghi đè báo cáo đã đóng.',
        })
        .expect(400);
      expect(closedRes.body.errorCode).toBe('ERR_REPORT_ALREADY_CLOSED');
    });

    it('4.3 Học viên kiểm tra phản hồi tại GET /question-reports/my (ẩn resolvedBy) và có thể gửi báo cáo mới sau khi báo cáo cũ đã đóng (UC29)', async () => {
      currentUser = studentFlow1;

      const myReportsRes = await request(app.getHttpServer())
        .get('/api/v1/question-reports/my')
        .expect(200);

      expect(myReportsRes.body.total).toBe(1);
      expect(myReportsRes.body.items[0]).toMatchObject({
        id: primaryReportId,
        questionId: reportedQuestionId,
        status: QuestionReportStatus.RESOLVED,
        resolutionNote: 'Đã thay thế file audio chuẩn cho câu hỏi số 1.',
      });
      expect(myReportsRes.body.items[0]).not.toHaveProperty('resolvedBy');
      expect(myReportsRes.body.items[0]).not.toHaveProperty('resolvedById');

      // Since the previous report is now RESOLVED, Partial Unique Index allows creating a new report on the same question!
      const newReportRes = await request(app.getHttpServer())
        .post(`/api/v1/questions/${reportedQuestionId}/reports`)
        .send({
          reason: QuestionReportReason.TYPO_ERROR,
          description: 'Báo cáo mới sau khi báo cáo cũ đã đóng.',
        })
        .expect(201);
      expect(newReportRes.body.status).toBe(QuestionReportStatus.PENDING);
    });
  });
});
