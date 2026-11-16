import 'reflect-metadata';
import { hash } from 'bcrypt';
import { config } from 'dotenv';
import dataSource from '../../../../src/database/data-source';
import { UserRole } from '../../../../src/common/enums/user-role.enum';
import { UserStatus } from '../../../../src/common/enums/user-status.enum';
import { ExamAttemptStatus } from '../../../../src/modules/exam-attempts/enums/exam-attempt-status.enum';
import { PartPracticeMode } from '../../../../src/modules/exam-attempts/enums/part-practice-mode.enum';
import { ExamStatus } from '../../../../src/modules/exams/enums/exam-status.enum';
import { ExamType } from '../../../../src/modules/exams/enums/exam-type.enum';
import { ScoreConversionType } from '../../../../src/modules/exams/enums/score-conversion-type.enum';
import { QuestionStatus } from '../../../../src/modules/questions/enums/question-status.enum';
import { QuestionType } from '../../../../src/modules/questions/enums/question-type.enum';

config();

export const POSTMAN_SPR7_FULL_EXAM_ID = 'd0000000-0000-4000-8000-000000000001';
export const POSTMAN_SPR7_RAW_EXAM_ID = 'd0000000-0000-4000-8000-000000000002';
export const POSTMAN_SPR7_EXPIRED_ATTEMPT_ID = 'd0000000-0000-4000-8000-000000000099';

export const POSTMAN_SPR7_Q1_ID = 'd0000000-0000-4000-8000-000000000011';
export const POSTMAN_SPR7_Q1_OPT_CORRECT = 'd0000000-0000-4000-8000-000000000111';
export const POSTMAN_SPR7_Q1_OPT_WRONG = 'd0000000-0000-4000-8000-000000000112';

export const POSTMAN_SPR7_Q2_ID = 'd0000000-0000-4000-8000-000000000012';
export const POSTMAN_SPR7_Q2_OPT_CORRECT = 'd0000000-0000-4000-8000-000000000121';
export const POSTMAN_SPR7_Q2_OPT_WRONG = 'd0000000-0000-4000-8000-000000000122';

export const POSTMAN_SPR7_Q3_ID = 'd0000000-0000-4000-8000-000000000013';
export const POSTMAN_SPR7_Q3_OPT_CORRECT = 'd0000000-0000-4000-8000-000000000131';
export const POSTMAN_SPR7_Q3_OPT_WRONG = 'd0000000-0000-4000-8000-000000000132';

export const POSTMAN_SPR7_Q4_ID = 'd0000000-0000-4000-8000-000000000014';
export const POSTMAN_SPR7_Q4_OPT_CORRECT = 'd0000000-0000-4000-8000-000000000141';
export const POSTMAN_SPR7_Q4_OPT_WRONG = 'd0000000-0000-4000-8000-000000000142';

const ALL_POSTMAN_EXAM_IDS = [POSTMAN_SPR7_FULL_EXAM_ID, POSTMAN_SPR7_RAW_EXAM_ID];

const ALL_POSTMAN_QUESTION_IDS = [
  POSTMAN_SPR7_Q1_ID,
  POSTMAN_SPR7_Q2_ID,
  POSTMAN_SPR7_Q3_ID,
  POSTMAN_SPR7_Q4_ID,
];

const TEST_ACCOUNTS = [
  { email: 'spr7.student1@example.com', role: UserRole.STUDENT },
  { email: 'spr7.student2@example.com', role: UserRole.STUDENT },
  { email: 'spr7.student3@example.com', role: UserRole.STUDENT },
  { email: 'spr7.teacher@example.com', role: UserRole.TEACHER },
];

async function seedSprint7Postman(): Promise<void> {
  await dataSource.initialize();
  const qr = dataSource.createQueryRunner();
  await qr.connect();

  try {
    await qr.startTransaction();

    // 1. Clean up existing Sprint 7 Postman data in strict FK order (PMR 032)
    await qr.query(
      `DELETE FROM question_reports
       WHERE question_id = ANY($1)
          OR reporter_id IN (SELECT id FROM users WHERE email LIKE 'spr7.%@example.com')`,
      [ALL_POSTMAN_QUESTION_IDS],
    );
    await qr.query(
      `DELETE FROM exam_attempt_answers
       WHERE attempt_id IN (
         SELECT id FROM exam_attempts
         WHERE exam_id = ANY($1)
            OR user_id IN (SELECT id FROM users WHERE email LIKE 'spr7.%@example.com')
       )`,
      [ALL_POSTMAN_EXAM_IDS],
    );
    await qr.query(
      `DELETE FROM exam_attempt_snapshots
       WHERE attempt_id IN (
         SELECT id FROM exam_attempts
         WHERE exam_id = ANY($1)
            OR user_id IN (SELECT id FROM users WHERE email LIKE 'spr7.%@example.com')
       )`,
      [ALL_POSTMAN_EXAM_IDS],
    );
    await qr.query(
      `DELETE FROM exam_attempts
       WHERE exam_id = ANY($1)
          OR user_id IN (SELECT id FROM users WHERE email LIKE 'spr7.%@example.com')`,
      [ALL_POSTMAN_EXAM_IDS],
    );
    await qr.query(`DELETE FROM exam_questions WHERE exam_id = ANY($1)`, [ALL_POSTMAN_EXAM_IDS]);
    await qr.query(`DELETE FROM exam_sections WHERE exam_id = ANY($1)`, [ALL_POSTMAN_EXAM_IDS]);
    await qr.query(`DELETE FROM exams WHERE id = ANY($1)`, [ALL_POSTMAN_EXAM_IDS]);
    await qr.query(
      `DELETE FROM media_resources
       WHERE question_id = ANY($1)
          OR question_group_id IN (SELECT id FROM question_groups WHERE title LIKE 'TEST_POSTMAN_SPR7_%')`,
      [ALL_POSTMAN_QUESTION_IDS],
    );
    await qr.query(`DELETE FROM question_options WHERE question_id = ANY($1)`, [
      ALL_POSTMAN_QUESTION_IDS,
    ]);
    await qr.query(`DELETE FROM question_skills WHERE question_id = ANY($1)`, [
      ALL_POSTMAN_QUESTION_IDS,
    ]);
    await qr.query(
      `DELETE FROM questions WHERE id = ANY($1) OR explanation LIKE 'TEST_POSTMAN_SPR7_%'`,
      [ALL_POSTMAN_QUESTION_IDS],
    );
    await qr.query(`DELETE FROM question_groups WHERE title LIKE 'TEST_POSTMAN_SPR7_%'`);
    await qr.query(`DELETE FROM skills WHERE code = 'TEST_POSTMAN_SPR7_GRAMMAR'`);

    // 2. Ensure test accounts exist with StrongPassword123!
    const passwordHash = await hash('StrongPassword123!', 10);
    const userIdByEmail = new Map<string, string>();

    for (const acc of TEST_ACCOUNTS) {
      const existing: Array<{ id: string }> = await qr.query(
        `SELECT id FROM users WHERE email = $1`,
        [acc.email],
      );
      if (existing.length === 0) {
        const inserted: Array<{ id: string }> = await qr.query(
          `INSERT INTO users (id, email, password_hash, role, status)
           VALUES (gen_random_uuid(), $1, $2, $3, $4)
           RETURNING id`,
          [acc.email, passwordHash, acc.role, UserStatus.ACTIVE],
        );
        const uid = inserted[0].id;
        userIdByEmail.set(acc.email, uid);
        await qr.query(
          `INSERT INTO user_profiles (id, user_id, full_name)
           VALUES (gen_random_uuid(), $1, $2)
           ON CONFLICT (user_id) DO NOTHING`,
          [uid, acc.email.split('@')[0]],
        );
      } else {
        const uid = existing[0].id;
        userIdByEmail.set(acc.email, uid);
        await qr.query(
          `UPDATE users SET password_hash = $1, role = $2, status = $3 WHERE id = $4`,
          [passwordHash, acc.role, UserStatus.ACTIVE, uid],
        );
      }
    }

    const teacherId = userIdByEmail.get('spr7.teacher@example.com')!;
    const student3Id = userIdByEmail.get('spr7.student3@example.com')!;

    // 3. Dynamically load toeic_parts (PMR 032)
    const parts: Array<{ id: string; part_number: number }> = await qr.query(
      `SELECT id, part_number FROM toeic_parts ORDER BY part_number ASC`,
    );
    const partMap = new Map<number, string>();
    for (const p of parts) {
      partMap.set(Number(p.part_number), p.id);
    }

    // 4. Create Skill for skillBreakdown verification
    const skillRes: Array<{ id: string }> = await qr.query(
      `INSERT INTO skills (id, code, name, description)
       VALUES (gen_random_uuid(), 'TEST_POSTMAN_SPR7_GRAMMAR', 'Ngữ pháp TOEIC Postman Sprint 7', 'Kỹ năng test Postman')
       RETURNING id`,
    );
    const skillId = skillRes[0].id;

    // 5. Create QuestionGroups for Part 3 and Part 7
    const grp3Res: Array<{ id: string }> = await qr.query(
      `INSERT INTO question_groups (id, title, context, created_by)
       VALUES (gen_random_uuid(), 'TEST_POSTMAN_SPR7_Group_Part_3', 'M: Welcome to the conference. W: Thank you.', $1)
       RETURNING id`,
      [teacherId],
    );
    const group3Id = grp3Res[0].id;

    const grp7Res: Array<{ id: string }> = await qr.query(
      `INSERT INTO question_groups (id, title, context, created_by)
       VALUES (gen_random_uuid(), 'TEST_POSTMAN_SPR7_Group_Part_7', 'Notice: The main lobby will be renovated next Monday.', $1)
       RETURNING id`,
      [teacherId],
    );
    const group7Id = grp7Res[0].id;

    // 6. Seed 4 deterministic questions:
    // Q1: Part 1 (content: null per Rule #1002)
    // Q2: Part 3 (group3Id)
    // Q3: Part 5 (attached to skillId)
    // Q4: Part 7 (group7Id)
    const questionConfigs = [
      {
        id: POSTMAN_SPR7_Q1_ID,
        partNumber: 1,
        content: null,
        groupId: null,
        groupOrder: null,
        explanation: 'TEST_POSTMAN_SPR7_EXP_Q1',
        optCorrect: POSTMAN_SPR7_Q1_OPT_CORRECT,
        optWrong: POSTMAN_SPR7_Q1_OPT_WRONG,
        nullableOptions: true,
        attachSkill: false,
      },
      {
        id: POSTMAN_SPR7_Q2_ID,
        partNumber: 3,
        content: 'TEST_POSTMAN_SPR7_Q2_Part3',
        groupId: group3Id,
        groupOrder: 1,
        explanation: 'TEST_POSTMAN_SPR7_EXP_Q2',
        optCorrect: POSTMAN_SPR7_Q2_OPT_CORRECT,
        optWrong: POSTMAN_SPR7_Q2_OPT_WRONG,
        nullableOptions: false,
        attachSkill: false,
      },
      {
        id: POSTMAN_SPR7_Q3_ID,
        partNumber: 5,
        content: 'TEST_POSTMAN_SPR7_Q3_Part5',
        groupId: null,
        groupOrder: null,
        explanation: 'TEST_POSTMAN_SPR7_EXP_Q3',
        optCorrect: POSTMAN_SPR7_Q3_OPT_CORRECT,
        optWrong: POSTMAN_SPR7_Q3_OPT_WRONG,
        nullableOptions: false,
        attachSkill: true,
      },
      {
        id: POSTMAN_SPR7_Q4_ID,
        partNumber: 7,
        content: 'TEST_POSTMAN_SPR7_Q4_Part7',
        groupId: group7Id,
        groupOrder: 1,
        explanation: 'TEST_POSTMAN_SPR7_EXP_Q4',
        optCorrect: POSTMAN_SPR7_Q4_OPT_CORRECT,
        optWrong: POSTMAN_SPR7_Q4_OPT_WRONG,
        nullableOptions: false,
        attachSkill: false,
      },
    ];

    for (const qc of questionConfigs) {
      await qr.query(
        `INSERT INTO questions (
           id, content, question_type, status, part_id,
           created_by, question_group_id, group_order, explanation, version
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 1)`,
        [
          qc.id,
          qc.content,
          QuestionType.SINGLE_CHOICE,
          QuestionStatus.PUBLISHED,
          partMap.get(qc.partNumber),
          teacherId,
          qc.groupId,
          qc.groupOrder,
          qc.explanation,
        ],
      );

      if (qc.attachSkill) {
        await qr.query(`INSERT INTO question_skills (question_id, skill_id) VALUES ($1, $2)`, [
          qc.id,
          skillId,
        ]);
      }

      await qr.query(
        `INSERT INTO question_options (id, question_id, label, content, is_correct, position)
         VALUES
           ($1, $3, 'A', $4, true, 1),
           ($2, $3, 'B', $5, false, 2),
           (gen_random_uuid(), $3, 'C', $6, false, 3),
           (gen_random_uuid(), $3, 'D', $7, false, 4)`,
        [
          qc.optCorrect,
          qc.optWrong,
          qc.id,
          qc.nullableOptions ? null : 'Correct Option A',
          qc.nullableOptions ? null : 'Wrong Option B',
          qc.nullableOptions ? null : 'Wrong Option C',
          qc.nullableOptions ? null : 'Wrong Option D',
        ],
      );
    }

    // 7. Create Full Exam (DEFAULT_ETS, is_shuffled_questions = false, is_shuffled_options = false for deterministic Postman IDs)
    await qr.query(
      `INSERT INTO exams (
         id, title, description, type, status, duration_minutes,
         allow_part_practice, max_attempts, score_conversion_type, passing_score,
         is_shuffled_questions, is_shuffled_options, created_by, version, is_deleted
       )
       VALUES ($1, 'TEST_POSTMAN_SPR7_Full_Exam', 'Đề thi Postman Sprint 7 DEFAULT_ETS', $2, $3, 120, true, 10, $4, 300, false, false, $5, 1, false)`,
      [
        POSTMAN_SPR7_FULL_EXAM_ID,
        ExamType.FULL_TEST,
        ExamStatus.PUBLISHED,
        ScoreConversionType.DEFAULT_ETS,
        teacherId,
      ],
    );

    // Create sections & exam_questions for POSTMAN_SPR7_FULL_EXAM_ID
    let orderIdx = 1;
    for (const qc of questionConfigs) {
      const secRes: Array<{ id: string }> = await qr.query(
        `INSERT INTO exam_sections (id, exam_id, part_id, target_questions_count, target_duration_minutes)
         VALUES (gen_random_uuid(), $1, $2, 1, 15)
         RETURNING id`,
        [POSTMAN_SPR7_FULL_EXAM_ID, partMap.get(qc.partNumber)],
      );

      await qr.query(
        `INSERT INTO exam_questions (id, exam_id, exam_section_id, question_id, question_group_id, order_index, group_order)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)`,
        [POSTMAN_SPR7_FULL_EXAM_ID, secRes[0].id, qc.id, qc.groupId, orderIdx++, qc.groupOrder],
      );
    }

    // 8. Create RAW_PERCENTAGE Exam (with Q3 Part 5)
    await qr.query(
      `INSERT INTO exams (
         id, title, description, type, status, duration_minutes,
         allow_part_practice, max_attempts, score_conversion_type, passing_score,
         is_shuffled_questions, is_shuffled_options, created_by, version, is_deleted
       )
       VALUES ($1, 'TEST_POSTMAN_SPR7_Raw_Exam', 'Đề thi Postman Sprint 7 RAW_PERCENTAGE', $2, $3, 60, true, 10, $4, 50, false, false, $5, 1, false)`,
      [
        POSTMAN_SPR7_RAW_EXAM_ID,
        ExamType.MINI_TEST,
        ExamStatus.PUBLISHED,
        ScoreConversionType.RAW_PERCENTAGE,
        teacherId,
      ],
    );

    const rawSecRes: Array<{ id: string }> = await qr.query(
      `INSERT INTO exam_sections (id, exam_id, part_id, target_questions_count, target_duration_minutes)
       VALUES (gen_random_uuid(), $1, $2, 1, 15)
       RETURNING id`,
      [POSTMAN_SPR7_RAW_EXAM_ID, partMap.get(5)],
    );

    await qr.query(
      `INSERT INTO exam_questions (id, exam_id, exam_section_id, question_id, question_group_id, order_index, group_order)
       VALUES (gen_random_uuid(), $1, $2, $3, NULL, 1, NULL)`,
      [POSTMAN_SPR7_RAW_EXAM_ID, rawSecRes[0].id, POSTMAN_SPR7_Q3_ID],
    );

    // 9. Pre-seed an expired attempt for student3 (expires_at = NOW() - 120s) to test timed_out via HTTP submit (PMR 032)
    await qr.query(
      `INSERT INTO exam_attempts (
         id, user_id, exam_id, status, mode, selected_parts,
         started_at, expires_at, total_questions, answered_count, version
       )
       VALUES (
         $1, $2, $3, $4, $5, NULL,
         NOW() - INTERVAL '7320 seconds', NOW() - INTERVAL '120 seconds', 4, 0, 1
       )`,
      [
        POSTMAN_SPR7_EXPIRED_ATTEMPT_ID,
        student3Id,
        POSTMAN_SPR7_FULL_EXAM_ID,
        ExamAttemptStatus.IN_PROGRESS,
        PartPracticeMode.FULL_EXAM,
      ],
    );

    const snapshotQuestions = questionConfigs.map((qc, idx) => ({
      id: qc.id,
      partNumber: qc.partNumber,
      orderIndex: idx + 1,
      originalQuestionNumber: idx + 1,
      questionGroupId: qc.groupId,
      content: qc.content,
      options: [
        {
          id: qc.optCorrect,
          label: 'A',
          content: qc.nullableOptions ? null : 'Correct Option A',
          position: 1,
        },
        {
          id: qc.optWrong,
          label: 'B',
          content: qc.nullableOptions ? null : 'Wrong Option B',
          position: 2,
        },
      ],
    }));

    const snapshotAnswerKey: Record<string, string> = {
      [POSTMAN_SPR7_Q1_ID]: POSTMAN_SPR7_Q1_OPT_CORRECT,
      [POSTMAN_SPR7_Q2_ID]: POSTMAN_SPR7_Q2_OPT_CORRECT,
      [POSTMAN_SPR7_Q3_ID]: POSTMAN_SPR7_Q3_OPT_CORRECT,
      [POSTMAN_SPR7_Q4_ID]: POSTMAN_SPR7_Q4_OPT_CORRECT,
    };

    await qr.query(
      `INSERT INTO exam_attempt_snapshots (
         id, attempt_id, exam_metadata, shuffled_questions, answer_key_snapshot,
         is_shuffled_questions, is_shuffled_options
       )
       VALUES (gen_random_uuid(), $1, $2, $3, $4, false, false)`,
      [
        POSTMAN_SPR7_EXPIRED_ATTEMPT_ID,
        JSON.stringify({
          id: POSTMAN_SPR7_FULL_EXAM_ID,
          title: 'TEST_POSTMAN_SPR7_Full_Exam',
          durationMinutes: 120,
          scoreConversionType: ScoreConversionType.DEFAULT_ETS,
          passingScore: 300,
        }),
        JSON.stringify(snapshotQuestions),
        JSON.stringify(snapshotAnswerKey),
      ],
    );

    await qr.commitTransaction();
    console.log('✅ Seeded Sprint 7 Postman fixtures successfully!');
  } catch (error) {
    await qr.rollbackTransaction();
    console.error('❌ Failed to seed Sprint 7 Postman fixtures:', error);
    process.exitCode = 1;
  } finally {
    await qr.release();
    await dataSource.destroy();
  }
}

void seedSprint7Postman();
