import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSprint6ExamAttemptsSchema1788000017000 implements MigrationInterface {
  name = 'CreateSprint6ExamAttemptsSchema1788000017000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create ENUM types
    await queryRunner.query(
      `CREATE TYPE "exam_attempt_status_enum" AS ENUM ('in_progress', 'submitted', 'abandoned', 'timed_out')`,
    );
    await queryRunner.query(
      `CREATE TYPE "part_practice_mode_enum" AS ENUM ('full_exam', 'part_practice')`,
    );

    // 2. Create exam_attempts table with check constraints (PMR 020)
    await queryRunner.query(`
      CREATE TABLE "exam_attempts" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "exam_id" uuid NOT NULL,
        "status" "exam_attempt_status_enum" NOT NULL DEFAULT 'in_progress',
        "mode" "part_practice_mode_enum" NOT NULL DEFAULT 'full_exam',
        "selected_parts" jsonb NULL,
        "started_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "submitted_at" timestamptz NULL,
        "expires_at" timestamptz NOT NULL,
        "total_questions" integer NOT NULL,
        "answered_count" integer NOT NULL DEFAULT 0,
        "device_info" varchar(500) NULL,
        "ip_address" varchar(50) NULL,
        "version" integer NOT NULL DEFAULT 1,
        "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "FK_exam_attempts_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_exam_attempts_exam" FOREIGN KEY ("exam_id")
          REFERENCES "exams"("id") ON DELETE RESTRICT,
        CONSTRAINT "chk_attempt_expires_after_started" CHECK ("expires_at" > "started_at"),
        CONSTRAINT "chk_attempt_total_questions_positive" CHECK ("total_questions" > 0),
        CONSTRAINT "chk_attempt_answered_count_non_negative" CHECK ("answered_count" >= 0)
      )
    `);

    // 3. Create Partial Unique Index for Single Active Attempt Invariant (PMR 017)
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_user_single_active_attempt"
      ON "exam_attempts" ("user_id")
      WHERE status = 'in_progress'
    `);

    // 4. Create standard indexes on exam_attempts
    await queryRunner.query(`
      CREATE INDEX "idx_attempts_user_exam_status"
      ON "exam_attempts" ("user_id", "exam_id", "status")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_attempts_user_status"
      ON "exam_attempts" ("user_id", "status")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_attempts_status_expires"
      ON "exam_attempts" ("status", "expires_at")
    `);

    // 5. Create exam_attempt_snapshots table
    await queryRunner.query(`
      CREATE TABLE "exam_attempt_snapshots" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "attempt_id" uuid NOT NULL,
        "exam_metadata" jsonb NOT NULL,
        "shuffled_questions" jsonb NOT NULL,
        "answer_key_snapshot" jsonb NOT NULL,
        "is_shuffled_questions" boolean NOT NULL DEFAULT false,
        "is_shuffled_options" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "UQ_attempt_snapshots_attempt_id" UNIQUE ("attempt_id"),
        CONSTRAINT "FK_attempt_snapshots_attempt" FOREIGN KEY ("attempt_id")
          REFERENCES "exam_attempts"("id") ON DELETE CASCADE
      )
    `);

    // 6. Create exam_attempt_answers table with check constraint (PMR 020)
    await queryRunner.query(`
      CREATE TABLE "exam_attempt_answers" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "attempt_id" uuid NOT NULL,
        "question_id" uuid NOT NULL,
        "selected_option_id" uuid NULL,
        "is_marked_for_review" boolean NOT NULL DEFAULT false,
        "time_spent_seconds" integer NOT NULL DEFAULT 0,
        "answered_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "uq_attempt_question_answer" UNIQUE ("attempt_id", "question_id"),
        CONSTRAINT "chk_answer_time_spent_non_negative" CHECK ("time_spent_seconds" >= 0),
        CONSTRAINT "FK_attempt_answers_attempt" FOREIGN KEY ("attempt_id")
          REFERENCES "exam_attempts"("id") ON DELETE CASCADE
      )
    `);

    // 7. Create index on exam_attempt_answers
    await queryRunner.query(`
      CREATE INDEX "idx_attempt_answers_attempt"
      ON "exam_attempt_answers" ("attempt_id")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Drop in reverse order to respect foreign key dependencies
    await queryRunner.query(`DROP TABLE IF EXISTS "exam_attempt_answers"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "exam_attempt_snapshots"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "exam_attempts"`);
    // Sử dụng CASCADE cho DROP TYPE để đảm bảo revert migration 100% không bị nghẽn (PMR 020)
    await queryRunner.query(`DROP TYPE IF EXISTS "part_practice_mode_enum" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "exam_attempt_status_enum" CASCADE`);
  }
}
