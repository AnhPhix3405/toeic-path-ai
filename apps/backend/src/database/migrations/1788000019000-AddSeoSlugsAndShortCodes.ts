import { MigrationInterface, QueryRunner } from 'typeorm';
import {
  generateAttemptCode,
  slugifyVietnamese,
} from '../../common/utils/slug.util';

export class AddSeoSlugsAndShortCodes1788000019000
  implements MigrationInterface
{
  name = 'AddSeoSlugsAndShortCodes1788000019000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // =========================================================================
    // STEP 1: Create PostgreSQL Sequences & Add Nullable Columns
    // =========================================================================
    await queryRunner.query(
      `CREATE SEQUENCE IF NOT EXISTS question_code_seq START 1 INCREMENT 1;`,
    );
    await queryRunner.query(
      `CREATE SEQUENCE IF NOT EXISTS question_group_code_seq START 1 INCREMENT 1;`,
    );
    await queryRunner.query(
      `CREATE SEQUENCE IF NOT EXISTS question_report_code_seq START 1 INCREMENT 1;`,
    );
    await queryRunner.query(
      `CREATE SEQUENCE IF NOT EXISTS import_job_code_seq START 1 INCREMENT 1;`,
    );

    await queryRunner.query(
      `ALTER TABLE "exams" ADD COLUMN IF NOT EXISTS "slug" varchar(255);`,
    );
    await queryRunner.query(
      `ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "question_code" varchar(20);`,
    );
    await queryRunner.query(
      `ALTER TABLE "question_groups" ADD COLUMN IF NOT EXISTS "group_code" varchar(20);`,
    );
    await queryRunner.query(
      `ALTER TABLE "question_reports" ADD COLUMN IF NOT EXISTS "report_code" varchar(20);`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_jobs" ADD COLUMN IF NOT EXISTS "job_code" varchar(20);`,
    );
    await queryRunner.query(
      `ALTER TABLE "exam_attempts" ADD COLUMN IF NOT EXISTS "attempt_code" varchar(20);`,
    );

    // =========================================================================
    // STEP 2: Backfill Existing Rows Ordered by created_at ASC & Advance Sequences Safely
    // =========================================================================

    // 2a. Backfill questions.question_code
    await queryRunner.query(`
      WITH ranked AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) AS rn
        FROM questions
      )
      UPDATE questions q
      SET question_code = 'Q-' || LPAD(r.rn::text, 5, '0')
      FROM ranked r
      WHERE q.id = r.id AND q.question_code IS NULL;
    `);
    await queryRunner.query(`
      SELECT CASE
        WHEN COUNT(*) > 0 THEN setval('question_code_seq', COUNT(*), true)
        ELSE setval('question_code_seq', 1, false)
      END FROM questions;
    `);

    // 2b. Backfill question_groups.group_code
    await queryRunner.query(`
      WITH ranked AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) AS rn
        FROM question_groups
      )
      UPDATE question_groups g
      SET group_code = 'QG-' || LPAD(r.rn::text, 5, '0')
      FROM ranked r
      WHERE g.id = r.id AND g.group_code IS NULL;
    `);
    await queryRunner.query(`
      SELECT CASE
        WHEN COUNT(*) > 0 THEN setval('question_group_code_seq', COUNT(*), true)
        ELSE setval('question_group_code_seq', 1, false)
      END FROM question_groups;
    `);

    // 2c. Backfill question_reports.report_code
    await queryRunner.query(`
      WITH ranked AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) AS rn
        FROM question_reports
      )
      UPDATE question_reports rp
      SET report_code = 'RP-' || LPAD(r.rn::text, 5, '0')
      FROM ranked r
      WHERE rp.id = r.id AND rp.report_code IS NULL;
    `);
    await queryRunner.query(`
      SELECT CASE
        WHEN COUNT(*) > 0 THEN setval('question_report_code_seq', COUNT(*), true)
        ELSE setval('question_report_code_seq', 1, false)
      END FROM question_reports;
    `);

    // 2d. Backfill import_jobs.job_code
    await queryRunner.query(`
      WITH ranked AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) AS rn
        FROM import_jobs
      )
      UPDATE import_jobs ij
      SET job_code = 'IMP-' || LPAD(r.rn::text, 5, '0')
      FROM ranked r
      WHERE ij.id = r.id AND ij.job_code IS NULL;
    `);
    await queryRunner.query(`
      SELECT CASE
        WHEN COUNT(*) > 0 THEN setval('import_job_code_seq', COUNT(*), true)
        ELSE setval('import_job_code_seq', 1, false)
      END FROM import_jobs;
    `);

    // 2e. Backfill exams.slug & deduplicate any pre-existing active duplicate titles safely
    const exams: Array<{
      id: string;
      title: string;
      slug: string | null;
      is_deleted: boolean;
    }> = await queryRunner.query(
      `SELECT id, title, slug, is_deleted FROM exams ORDER BY created_at ASC, id ASC;`,
    );

    const usedActiveTitles = new Set<string>();
    const usedSlugs = new Set<string>();

    for (const exam of exams) {
      let currentTitle = exam.title;
      if (!exam.is_deleted) {
        const normalizedTitle = currentTitle.trim().toLowerCase();
        if (usedActiveTitles.has(normalizedTitle)) {
          let suffix = 2;
          while (
            usedActiveTitles.has(
              `${normalizedTitle} (${suffix})`,
            )
          ) {
            suffix++;
          }
          currentTitle = `${currentTitle.trim()} (${suffix})`;
          await queryRunner.query(
            `UPDATE exams SET title = $1 WHERE id = $2;`,
            [currentTitle, exam.id],
          );
        }
        usedActiveTitles.add(currentTitle.trim().toLowerCase());
      }

      if (exam.slug && !usedSlugs.has(exam.slug)) {
        usedSlugs.add(exam.slug);
        continue;
      }

      const baseSlug = slugifyVietnamese(currentTitle);
      let candidate = baseSlug;
      let counter = 2;
      while (usedSlugs.has(candidate)) {
        candidate = `${baseSlug}-${counter}`;
        counter++;
      }
      usedSlugs.add(candidate);
      await queryRunner.query(`UPDATE exams SET slug = $1 WHERE id = $2;`, [
        candidate,
        exam.id,
      ]);
    }

    // 2f. Backfill exam_attempts.attempt_code with cryptographically random att_<10 base62 chars>
    const attempts: Array<{ id: string; attempt_code: string | null }> =
      await queryRunner.query(
        `SELECT id, attempt_code FROM exam_attempts ORDER BY created_at ASC, id ASC;`,
      );
    const usedAttemptCodes = new Set<string>(
      attempts
        .map((a) => a.attempt_code)
        .filter((c): c is string => Boolean(c)),
    );

    for (const attempt of attempts) {
      if (attempt.attempt_code) continue;
      let code = generateAttemptCode();
      while (usedAttemptCodes.has(code)) {
        code = generateAttemptCode();
      }
      usedAttemptCodes.add(code);
      await queryRunner.query(
        `UPDATE exam_attempts SET attempt_code = $1 WHERE id = $2;`,
        [code, attempt.id],
      );
    }

    // =========================================================================
    // STEP 3: Column DEFAULTs (PMR SEO-001 #2), NOT NULL & UNIQUE INDEXES
    // =========================================================================
    await queryRunner.query(`
      ALTER TABLE "questions"
        ALTER COLUMN "question_code" SET DEFAULT ('Q-' || LPAD(nextval('question_code_seq')::text, 5, '0')),
        ALTER COLUMN "question_code" SET NOT NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE "question_groups"
        ALTER COLUMN "group_code" SET DEFAULT ('QG-' || LPAD(nextval('question_group_code_seq')::text, 5, '0')),
        ALTER COLUMN "group_code" SET NOT NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE "question_reports"
        ALTER COLUMN "report_code" SET DEFAULT ('RP-' || LPAD(nextval('question_report_code_seq')::text, 5, '0')),
        ALTER COLUMN "report_code" SET NOT NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE "import_jobs"
        ALTER COLUMN "job_code" SET DEFAULT ('IMP-' || LPAD(nextval('import_job_code_seq')::text, 5, '0')),
        ALTER COLUMN "job_code" SET NOT NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE "exams"
        ALTER COLUMN "slug" SET NOT NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE "exam_attempts"
        ALTER COLUMN "attempt_code" SET NOT NULL;
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_exams_slug" ON "exams" ("slug");`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_exams_active_title" ON "exams" (LOWER(TRIM("title"))) WHERE "is_deleted" = false;`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_questions_code" ON "questions" ("question_code");`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_question_groups_code" ON "question_groups" ("group_code");`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_question_reports_code" ON "question_reports" ("report_code");`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_import_jobs_code" ON "import_jobs" ("job_code");`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_exam_attempts_code" ON "exam_attempts" ("attempt_code");`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_exam_attempts_code";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_import_jobs_code";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_question_reports_code";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_question_groups_code";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_questions_code";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_exams_active_title";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_exams_slug";`);

    await queryRunner.query(
      `ALTER TABLE "exam_attempts" DROP COLUMN IF EXISTS "attempt_code";`,
    );
    await queryRunner.query(
      `ALTER TABLE "import_jobs" DROP COLUMN IF EXISTS "job_code";`,
    );
    await queryRunner.query(
      `ALTER TABLE "question_reports" DROP COLUMN IF EXISTS "report_code";`,
    );
    await queryRunner.query(
      `ALTER TABLE "question_groups" DROP COLUMN IF EXISTS "group_code";`,
    );
    await queryRunner.query(
      `ALTER TABLE "questions" DROP COLUMN IF EXISTS "question_code";`,
    );
    await queryRunner.query(
      `ALTER TABLE "exams" DROP COLUMN IF EXISTS "slug";`,
    );

    await queryRunner.query(`DROP SEQUENCE IF EXISTS import_job_code_seq;`);
    await queryRunner.query(
      `DROP SEQUENCE IF EXISTS question_report_code_seq;`,
    );
    await queryRunner.query(
      `DROP SEQUENCE IF EXISTS question_group_code_seq;`,
    );
    await queryRunner.query(`DROP SEQUENCE IF EXISTS question_code_seq;`);
  }
}
