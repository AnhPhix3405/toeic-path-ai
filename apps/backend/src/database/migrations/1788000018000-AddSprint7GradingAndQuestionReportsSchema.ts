import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSprint7GradingAndQuestionReportsSchema1788000018000 implements MigrationInterface {
  name = 'AddSprint7GradingAndQuestionReportsSchema1788000018000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "exam_attempts"
        ADD COLUMN "duration_spent_seconds" integer NULL,
        ADD COLUMN "total_score" integer NULL,
        ADD COLUMN "listening_score" integer NULL,
        ADD COLUMN "reading_score" integer NULL,
        ADD COLUMN "correct_count" integer NULL,
        ADD COLUMN "wrong_count" integer NULL,
        ADD COLUMN "skipped_count" integer NULL,
        ADD COLUMN "accuracy_percentage" numeric(5,2) NULL,
        ADD COLUMN "is_passed" boolean NULL,
        ADD COLUMN "part_breakdown" jsonb NULL,
        ADD COLUMN "skill_breakdown" jsonb NULL,
        ADD COLUMN "graded_at" timestamptz NULL,
        ADD CONSTRAINT "chk_attempt_duration_spent_non_negative"
          CHECK ("duration_spent_seconds" IS NULL OR "duration_spent_seconds" >= 0),
        ADD CONSTRAINT "chk_attempt_scores_range"
          CHECK (
            ("listening_score" IS NULL OR ("listening_score" >= 5 AND "listening_score" <= 495)) AND
            ("reading_score" IS NULL OR ("reading_score" >= 5 AND "reading_score" <= 495)) AND
            ("total_score" IS NULL OR ("total_score" >= 10 AND "total_score" <= 990))
          ),
        ADD CONSTRAINT "chk_attempt_counts_non_negative"
          CHECK (
            ("correct_count" IS NULL OR "correct_count" >= 0) AND
            ("wrong_count" IS NULL OR "wrong_count" >= 0) AND
            ("skipped_count" IS NULL OR "skipped_count" >= 0)
          ),
        ADD CONSTRAINT "chk_attempt_accuracy_range"
          CHECK ("accuracy_percentage" IS NULL OR ("accuracy_percentage" >= 0 AND "accuracy_percentage" <= 100))
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_attempts_user_started_at"
      ON "exam_attempts" ("user_id", "started_at" DESC)
    `);

    await queryRunner.query(`
      ALTER TABLE "exam_attempt_answers"
        ADD COLUMN "is_correct" boolean NULL
    `);

    await queryRunner.query(`
      CREATE TYPE "question_report_reason_enum" AS ENUM (
        'wrong_answer',
        'typo_error',
        'broken_media',
        'unclear_explanation',
        'other'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "question_report_status_enum" AS ENUM (
        'pending',
        'in_review',
        'resolved',
        'rejected'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "question_reports" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "question_id" uuid NOT NULL,
        "reporter_id" uuid NOT NULL,
        "attempt_id" uuid NULL,
        "reason" "question_report_reason_enum" NOT NULL,
        "description" varchar(1000) NULL,
        "status" "question_report_status_enum" NOT NULL DEFAULT 'pending',
        "resolved_by" uuid NULL,
        "resolved_at" timestamptz NULL,
        "resolution_note" varchar(1000) NULL,
        "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "FK_question_reports_question" FOREIGN KEY ("question_id")
          REFERENCES "questions"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_question_reports_reporter" FOREIGN KEY ("reporter_id")
          REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_question_reports_attempt" FOREIGN KEY ("attempt_id")
          REFERENCES "exam_attempts"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_question_reports_resolved_by" FOREIGN KEY ("resolved_by")
          REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_reporter_open_question_report"
      ON "question_reports" ("reporter_id", "question_id")
      WHERE status IN ('pending', 'in_review')
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_question_reports_status_created"
      ON "question_reports" ("status", "created_at" DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_question_reports_question_status"
      ON "question_reports" ("question_id", "status")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_question_reports_reporter_created"
      ON "question_reports" ("reporter_id", "created_at" DESC)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "question_reports"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "question_report_status_enum" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "question_report_reason_enum" CASCADE`);

    await queryRunner.query(`
      ALTER TABLE "exam_attempt_answers"
        DROP COLUMN IF EXISTS "is_correct"
    `);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_attempts_user_started_at"`);
    await queryRunner.query(`
      ALTER TABLE "exam_attempts"
        DROP CONSTRAINT IF EXISTS "chk_attempt_accuracy_range",
        DROP CONSTRAINT IF EXISTS "chk_attempt_counts_non_negative",
        DROP CONSTRAINT IF EXISTS "chk_attempt_scores_range",
        DROP CONSTRAINT IF EXISTS "chk_attempt_duration_spent_non_negative",
        DROP COLUMN IF EXISTS "graded_at",
        DROP COLUMN IF EXISTS "skill_breakdown",
        DROP COLUMN IF EXISTS "part_breakdown",
        DROP COLUMN IF EXISTS "is_passed",
        DROP COLUMN IF EXISTS "accuracy_percentage",
        DROP COLUMN IF EXISTS "skipped_count",
        DROP COLUMN IF EXISTS "wrong_count",
        DROP COLUMN IF EXISTS "correct_count",
        DROP COLUMN IF EXISTS "reading_score",
        DROP COLUMN IF EXISTS "listening_score",
        DROP COLUMN IF EXISTS "total_score",
        DROP COLUMN IF EXISTS "duration_spent_seconds"
    `);
  }
}
