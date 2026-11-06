import 'reflect-metadata';
import { hash } from 'bcrypt';
import { config } from 'dotenv';
import dataSource from '../../../../src/database/data-source';
import { ExamType } from '../../../../src/modules/exams/enums/exam-type.enum';
import { ExamStatus } from '../../../../src/modules/exams/enums/exam-status.enum';
import { QuestionType } from '../../../../src/modules/questions/enums/question-type.enum';
import { QuestionStatus } from '../../../../src/modules/questions/enums/question-status.enum';
import { UserRole } from '../../../../src/common/enums/user-role.enum';
import { UserStatus } from '../../../../src/common/enums/user-status.enum';

config();

export const POSTMAN_FULL_EXAM_ID = 'c0000000-0000-4000-8000-000000000001';
export const POSTMAN_EXAM_B_ID = 'c0000000-0000-4000-8000-000000000002';
export const POSTMAN_NO_PART_PRACTICE_EXAM_ID = 'c0000000-0000-4000-8000-000000000003';
export const POSTMAN_FUTURE_EXAM_ID = 'c0000000-0000-4000-8000-000000000004';
export const POSTMAN_CLOSED_EXAM_ID = 'c0000000-0000-4000-8000-000000000005';
export const POSTMAN_ONE_ATTEMPT_EXAM_ID = 'c0000000-0000-4000-8000-000000000006';

const ALL_POSTMAN_EXAM_IDS = [
  POSTMAN_FULL_EXAM_ID,
  POSTMAN_EXAM_B_ID,
  POSTMAN_NO_PART_PRACTICE_EXAM_ID,
  POSTMAN_FUTURE_EXAM_ID,
  POSTMAN_CLOSED_EXAM_ID,
  POSTMAN_ONE_ATTEMPT_EXAM_ID,
];

async function seedSprint6Postman(): Promise<void> {
  await dataSource.initialize();
  const qr = dataSource.createQueryRunner();
  await qr.connect();

  try {
    await qr.startTransaction();

    // 1. Dọn dẹp dữ liệu cũ nếu đã tồn tại
    await qr.query(
      `DELETE FROM exam_attempt_answers WHERE attempt_id IN (SELECT id FROM exam_attempts WHERE exam_id = ANY($1))`,
      [ALL_POSTMAN_EXAM_IDS],
    );
    await qr.query(
      `DELETE FROM exam_attempt_snapshots WHERE attempt_id IN (SELECT id FROM exam_attempts WHERE exam_id = ANY($1))`,
      [ALL_POSTMAN_EXAM_IDS],
    );
    await qr.query(`DELETE FROM exam_attempts WHERE exam_id = ANY($1)`, [ALL_POSTMAN_EXAM_IDS]);
    await qr.query(`DELETE FROM exam_questions WHERE exam_id = ANY($1)`, [ALL_POSTMAN_EXAM_IDS]);
    await qr.query(`DELETE FROM exam_sections WHERE exam_id = ANY($1)`, [ALL_POSTMAN_EXAM_IDS]);
    await qr.query(`DELETE FROM exams WHERE id = ANY($1)`, [ALL_POSTMAN_EXAM_IDS]);
    await qr.query(
      `DELETE FROM question_options WHERE question_id IN (SELECT id FROM questions WHERE content LIKE 'TEST_POSTMAN_SPR6_%')`,
    );
    await qr.query(`DELETE FROM questions WHERE content LIKE 'TEST_POSTMAN_SPR6_%'`);
    await qr.query(`DELETE FROM question_groups WHERE title LIKE 'TEST_POSTMAN_SPR6_%'`);

    // 2. Tìm admin user id
    const adminRes = await qr.query(`SELECT id FROM users WHERE role = 'admin' LIMIT 1`);
    const adminId = adminRes[0]?.id;
    if (!adminId) {
      throw new Error('Admin user not found. Please run seed:admin first.');
    }

    // 2.1 Pre-seed test student accounts để tránh rate limiting khi chạy collections
    const defaultPasswordHash = await hash('StrongPassword123!', 10);
    const testStudentEmails = [
      'student1@example.com',
      'student2@example.com',
      'task2.student1@example.com',
      'task2.student2@example.com',
      'task3.student1@example.com',
      'task3.student2@example.com',
      'task4.student1@example.com',
      'task4.student2@example.com',
      'task5.student1@example.com',
      'task5.student2@example.com',
    ];

    for (const email of testStudentEmails) {
      const existingUser = await qr.query(`SELECT id FROM users WHERE email = $1`, [email]);
      if (existingUser.length === 0) {
        const userInsert = await qr.query(
          `INSERT INTO users (id, email, password_hash, role, status)
           VALUES (gen_random_uuid(), $1, $2, $3, $4) RETURNING id`,
          [email, defaultPasswordHash, UserRole.STUDENT, UserStatus.ACTIVE],
        );
        const newUserId = userInsert[0].id;
        await qr.query(
          `INSERT INTO user_profiles (id, user_id, full_name)
           VALUES (gen_random_uuid(), $1, $2)`,
          [newUserId, email.split('@')[0]],
        );
      }
    }

    // 3. Lấy part IDs từ toeic_parts
    const parts = await qr.query(
      `SELECT id, part_number FROM toeic_parts ORDER BY part_number ASC`,
    );
    const partMap = new Map<number, string>();
    for (const p of parts) {
      partMap.set(p.part_number, p.id);
    }

    // 4. Tạo đề thi chính: Full Test (20 questions)
    await qr.query(
      `INSERT INTO exams (id, title, description, type, status, duration_minutes, allow_part_practice, max_attempts, is_shuffled_questions, is_shuffled_options, created_by, version, is_deleted)
       VALUES ($1, 'TEST_POSTMAN_SPR6_Full_Exam', 'Đề thi Postman Automated E2E Sprint 6', $2, $3, 120, true, 5, true, true, $4, 1, false)`,
      [POSTMAN_FULL_EXAM_ID, ExamType.FULL_TEST, ExamStatus.PUBLISHED, adminId],
    );

    // Kế hoạch câu hỏi
    const partPlan: Record<number, { count: number; isGroup: boolean }> = {
      1: { count: 2, isGroup: false },
      2: { count: 2, isGroup: false },
      3: { count: 3, isGroup: true },
      4: { count: 3, isGroup: true },
      5: { count: 4, isGroup: false },
      6: { count: 3, isGroup: true },
      7: { count: 3, isGroup: true },
    };

    // Tạo 7 sections
    const sectionMap = new Map<number, string>();
    for (let p = 1; p <= 7; p++) {
      const secRes = await qr.query(
        `INSERT INTO exam_sections (id, exam_id, part_id, target_questions_count, target_duration_minutes)
         VALUES (gen_random_uuid(), $1, $2, $3, $4)
         RETURNING id`,
        [POSTMAN_FULL_EXAM_ID, partMap.get(p), partPlan[p].count, p === 5 ? 12 : p === 6 ? 8 : 15],
      );
      sectionMap.set(p, secRes[0].id);
    }

    // Tạo QuestionGroups
    const groupMap = new Map<number, string>();
    for (const p of [3, 4, 6, 7]) {
      const gRes = await qr.query(
        `INSERT INTO question_groups (id, title, context, created_by)
         VALUES (gen_random_uuid(), 'TEST_POSTMAN_SPR6_Group_Part_${p}', 'Passage text context for Part ${p}', $1)
         RETURNING id`,
        [adminId],
      );
      groupMap.set(p, gRes[0].id);
    }

    // Tạo 20 questions
    let orderIdx = 1;
    for (let p = 1; p <= 7; p++) {
      const plan = partPlan[p];
      const secId = sectionMap.get(p)!;
      const partId = partMap.get(p)!;
      const groupId = plan.isGroup ? groupMap.get(p)! : null;

      for (let i = 1; i <= plan.count; i++) {
        const qRes = await qr.query(
          `INSERT INTO questions (id, content, question_type, status, part_id, created_by, question_group_id, group_order, version)
           VALUES (gen_random_uuid(), 'TEST_POSTMAN_SPR6_Q_${orderIdx}', $1, $2, $3, $4, $5, $6, 1)
           RETURNING id`,
          [
            QuestionType.SINGLE_CHOICE,
            QuestionStatus.PUBLISHED,
            partId,
            adminId,
            groupId,
            plan.isGroup ? i : null,
          ],
        );
        const qId = qRes[0].id;

        await qr.query(
          `INSERT INTO question_options (id, question_id, label, content, is_correct, position)
           VALUES
           (gen_random_uuid(), $1, 'A', 'Option A content', true, 1),
           (gen_random_uuid(), $1, 'B', 'Option B content', false, 2),
           (gen_random_uuid(), $1, 'C', 'Option C content', false, 3),
           (gen_random_uuid(), $1, 'D', 'Option D content', false, 4)`,
          [qId],
        );

        await qr.query(
          `INSERT INTO exam_questions (id, exam_id, exam_section_id, question_id, question_group_id, group_order, order_index)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)`,
          [POSTMAN_FULL_EXAM_ID, secId, qId, groupId, plan.isGroup ? i : null, orderIdx],
        );

        orderIdx++;
      }
    }

    // 5. Tạo đề thi thứ hai: Exam B
    await qr.query(
      `INSERT INTO exams (id, title, description, type, status, duration_minutes, allow_part_practice, max_attempts, is_shuffled_questions, is_shuffled_options, created_by, version, is_deleted)
       VALUES ($1, 'TEST_POSTMAN_SPR6_Exam_B', 'Đề thi B để test conflict 409', $2, $3, 30, true, 3, false, false, $4, 1, false)`,
      [POSTMAN_EXAM_B_ID, ExamType.MINI_TEST, ExamStatus.PUBLISHED, adminId],
    );

    const bSecRes = await qr.query(
      `INSERT INTO exam_sections (id, exam_id, part_id, target_questions_count, target_duration_minutes)
       VALUES (gen_random_uuid(), $1, $2, 2, 15)
       RETURNING id`,
      [POSTMAN_EXAM_B_ID, partMap.get(5)],
    );
    const bSecId = bSecRes[0].id;

    for (let j = 1; j <= 2; j++) {
      const qRes = await qr.query(
        `INSERT INTO questions (id, content, question_type, status, part_id, created_by, version)
         VALUES (gen_random_uuid(), 'TEST_POSTMAN_SPR6_B_Q_${j}', $1, $2, $3, $4, 1)
         RETURNING id`,
        [QuestionType.SINGLE_CHOICE, QuestionStatus.PUBLISHED, partMap.get(5), adminId],
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
        [POSTMAN_EXAM_B_ID, bSecId, qId, j],
      );
    }

    // 6. Tạo đề thi C: Không cho phép luyện tập theo Part (allow_part_practice = false)
    await qr.query(
      `INSERT INTO exams (id, title, description, type, status, duration_minutes, allow_part_practice, max_attempts, is_shuffled_questions, is_shuffled_options, created_by, version, is_deleted)
       VALUES ($1, 'TEST_POSTMAN_SPR6_No_Practice', 'Đề không cho phép part practice', $2, $3, 30, false, 5, false, false, $4, 1, false)`,
      [POSTMAN_NO_PART_PRACTICE_EXAM_ID, ExamType.MINI_TEST, ExamStatus.PUBLISHED, adminId],
    );
    const cSecRes = await qr.query(
      `INSERT INTO exam_sections (id, exam_id, part_id, target_questions_count, target_duration_minutes)
       VALUES (gen_random_uuid(), $1, $2, 1, 15) RETURNING id`,
      [POSTMAN_NO_PART_PRACTICE_EXAM_ID, partMap.get(5)],
    );
    const q3Res = await qr.query(
      `INSERT INTO questions (id, content, question_type, status, part_id, created_by, version)
       VALUES (gen_random_uuid(), 'TEST_POSTMAN_SPR6_C_Q_1', $1, $2, $3, $4, 1) RETURNING id`,
      [QuestionType.SINGLE_CHOICE, QuestionStatus.PUBLISHED, partMap.get(5), adminId],
    );
    await qr.query(
      `INSERT INTO exam_questions (id, exam_id, exam_section_id, question_id, order_index) VALUES (gen_random_uuid(), $1, $2, $3, 1)`,
      [POSTMAN_NO_PART_PRACTICE_EXAM_ID, cSecRes[0].id, q3Res[0].id],
    );

    // 7. Tạo đề thi D: Chưa đến giờ mở thi (open_at tương lai)
    await qr.query(
      `INSERT INTO exams (id, title, description, type, status, duration_minutes, allow_part_practice, max_attempts, is_shuffled_questions, is_shuffled_options, open_at, created_by, version, is_deleted)
       VALUES ($1, 'TEST_POSTMAN_SPR6_Future_Exam', 'Đề chưa mở thi', $2, $3, 30, true, 5, false, false, NOW() + INTERVAL '30 days', $4, 1, false)`,
      [POSTMAN_FUTURE_EXAM_ID, ExamType.MINI_TEST, ExamStatus.PUBLISHED, adminId],
    );
    const dSecRes = await qr.query(
      `INSERT INTO exam_sections (id, exam_id, part_id, target_questions_count, target_duration_minutes)
       VALUES (gen_random_uuid(), $1, $2, 1, 15) RETURNING id`,
      [POSTMAN_FUTURE_EXAM_ID, partMap.get(5)],
    );
    const q4Res = await qr.query(
      `INSERT INTO questions (id, content, question_type, status, part_id, created_by, version)
       VALUES (gen_random_uuid(), 'TEST_POSTMAN_SPR6_D_Q_1', $1, $2, $3, $4, 1) RETURNING id`,
      [QuestionType.SINGLE_CHOICE, QuestionStatus.PUBLISHED, partMap.get(5), adminId],
    );
    await qr.query(
      `INSERT INTO exam_questions (id, exam_id, exam_section_id, question_id, order_index) VALUES (gen_random_uuid(), $1, $2, $3, 1)`,
      [POSTMAN_FUTURE_EXAM_ID, dSecRes[0].id, q4Res[0].id],
    );

    // 8. Tạo đề thi E: Đã quá hạn đóng đề (close_at quá khứ)
    await qr.query(
      `INSERT INTO exams (id, title, description, type, status, duration_minutes, allow_part_practice, max_attempts, is_shuffled_questions, is_shuffled_options, close_at, created_by, version, is_deleted)
       VALUES ($1, 'TEST_POSTMAN_SPR6_Closed_Exam', 'Đề đã đóng', $2, $3, 30, true, 5, false, false, NOW() - INTERVAL '30 days', $4, 1, false)`,
      [POSTMAN_CLOSED_EXAM_ID, ExamType.MINI_TEST, ExamStatus.PUBLISHED, adminId],
    );
    const eSecRes = await qr.query(
      `INSERT INTO exam_sections (id, exam_id, part_id, target_questions_count, target_duration_minutes)
       VALUES (gen_random_uuid(), $1, $2, 1, 15) RETURNING id`,
      [POSTMAN_CLOSED_EXAM_ID, partMap.get(5)],
    );
    const q5Res = await qr.query(
      `INSERT INTO questions (id, content, question_type, status, part_id, created_by, version)
       VALUES (gen_random_uuid(), 'TEST_POSTMAN_SPR6_E_Q_1', $1, $2, $3, $4, 1) RETURNING id`,
      [QuestionType.SINGLE_CHOICE, QuestionStatus.PUBLISHED, partMap.get(5), adminId],
    );
    await qr.query(
      `INSERT INTO exam_questions (id, exam_id, exam_section_id, question_id, order_index) VALUES (gen_random_uuid(), $1, $2, $3, 1)`,
      [POSTMAN_CLOSED_EXAM_ID, eSecRes[0].id, q5Res[0].id],
    );

    // 9. Tạo đề thi F: Giới hạn 1 lượt thi (max_attempts = 1)
    await qr.query(
      `INSERT INTO exams (id, title, description, type, status, duration_minutes, allow_part_practice, max_attempts, is_shuffled_questions, is_shuffled_options, created_by, version, is_deleted)
       VALUES ($1, 'TEST_POSTMAN_SPR6_One_Attempt', 'Đề chỉ cho thi đúng 1 lần', $2, $3, 30, false, 1, false, false, $4, 1, false)`,
      [POSTMAN_ONE_ATTEMPT_EXAM_ID, ExamType.MINI_TEST, ExamStatus.PUBLISHED, adminId],
    );
    const fSecRes = await qr.query(
      `INSERT INTO exam_sections (id, exam_id, part_id, target_questions_count, target_duration_minutes)
       VALUES (gen_random_uuid(), $1, $2, 1, 15) RETURNING id`,
      [POSTMAN_ONE_ATTEMPT_EXAM_ID, partMap.get(5)],
    );
    const q6Res = await qr.query(
      `INSERT INTO questions (id, content, question_type, status, part_id, created_by, version)
       VALUES (gen_random_uuid(), 'TEST_POSTMAN_SPR6_F_Q_1', $1, $2, $3, $4, 1) RETURNING id`,
      [QuestionType.SINGLE_CHOICE, QuestionStatus.PUBLISHED, partMap.get(5), adminId],
    );
    await qr.query(
      `INSERT INTO exam_questions (id, exam_id, exam_section_id, question_id, order_index) VALUES (gen_random_uuid(), $1, $2, $3, 1)`,
      [POSTMAN_ONE_ATTEMPT_EXAM_ID, fSecRes[0].id, q6Res[0].id],
    );

    await qr.commitTransaction();
    process.stdout.write('Sprint 6 Postman Test Exams seeded successfully!\n');
  } catch (err) {
    await qr.rollbackTransaction();
    throw err;
  } finally {
    await qr.release();
    await dataSource.destroy();
  }
}

seedSprint6Postman().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
