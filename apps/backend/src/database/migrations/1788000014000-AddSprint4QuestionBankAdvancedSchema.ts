import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSprint4QuestionBankAdvancedSchema1788000014000 implements MigrationInterface {
  name = 'AddSprint4QuestionBankAdvancedSchema1788000014000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Extend questions_status_enum with new workflow statuses
    await queryRunner.query(
      `ALTER TYPE "questions_status_enum" ADD VALUE IF NOT EXISTS 'pending_review'`,
    );
    await queryRunner.query(
      `ALTER TYPE "questions_status_enum" ADD VALUE IF NOT EXISTS 'published'`,
    );
    await queryRunner.query(
      `ALTER TYPE "questions_status_enum" ADD VALUE IF NOT EXISTS 'revision_requested'`,
    );
    await queryRunner.query(
      `ALTER TYPE "questions_status_enum" ADD VALUE IF NOT EXISTS 'rejected'`,
    );

    // 2. Add version column for optimistic locking on questions
    await queryRunner.query(`
      ALTER TABLE "questions"
      ADD COLUMN IF NOT EXISTS "version" integer NOT NULL DEFAULT 1
    `);

    // 3. Create ENUM types for Sprint 4 features
    await queryRunner.query(`CREATE TYPE "media_resource_type_enum" AS ENUM ('audio', 'image')`);
    await queryRunner.query(`
      CREATE TYPE "question_history_change_type_enum" AS ENUM (
        'created',
        'updated',
        'resubmitted',
        'status_changed',
        'quick_fixed'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "question_review_action_enum" AS ENUM (
        'approved',
        'revision_requested',
        'rejected',
        'quick_fix_approved'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "import_job_status_enum" AS ENUM (
        'pending',
        'processing',
        'completed',
        'failed',
        'partially_completed'
      )
    `);

    // 4. Create media_resources table with Soft Delete and Check Constraint
    await queryRunner.query(`
      CREATE TABLE "media_resources" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "file_name" varchar(255) NOT NULL,
        "file_url" text NOT NULL,
        "resource_type" "media_resource_type_enum" NOT NULL,
        "mime_type" varchar(100) NOT NULL,
        "file_size" integer NOT NULL,
        "question_id" uuid NULL,
        "question_group_id" uuid NULL,
        "is_deleted" boolean NOT NULL DEFAULT false,
        "deleted_at" timestamptz NULL,
        "created_by" uuid NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_media_resources_question_id" FOREIGN KEY ("question_id")
          REFERENCES "questions"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_media_resources_question_group_id" FOREIGN KEY ("question_group_id")
          REFERENCES "question_groups"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_media_resources_created_by" FOREIGN KEY ("created_by")
          REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "chk_media_target_exclusive" CHECK (
          ("question_id" IS NOT NULL AND "question_group_id" IS NULL) OR
          ("question_id" IS NULL AND "question_group_id" IS NOT NULL) OR
          ("question_id" IS NULL AND "question_group_id" IS NULL)
        )
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_media_resources_question_active"
      ON "media_resources" ("question_id", "is_deleted")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_media_resources_group_active"
      ON "media_resources" ("question_group_id", "is_deleted")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_media_resources_cleanup"
      ON "media_resources" ("is_deleted", "deleted_at")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_media_resources_created_at"
      ON "media_resources" ("created_at")
    `);

    // 5. Create question_histories table (Audit logging & JSON snapshot comparison)
    await queryRunner.query(`
      CREATE TABLE "question_histories" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "question_id" uuid NOT NULL,
        "changed_by" uuid NOT NULL,
        "change_type" "question_history_change_type_enum" NOT NULL,
        "snapshot_before" jsonb NULL,
        "snapshot_after" jsonb NOT NULL,
        "comment" text NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_question_histories_question_id" FOREIGN KEY ("question_id")
          REFERENCES "questions"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_question_histories_changed_by" FOREIGN KEY ("changed_by")
          REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_question_histories_question_id"
      ON "question_histories" ("question_id", "created_at" DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_question_histories_changed_by"
      ON "question_histories" ("changed_by")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_question_histories_created_at"
      ON "question_histories" ("created_at")
    `);

    // 6. Create question_reviews table (Reviewer feedback, audit timeline)
    await queryRunner.query(`
      CREATE TABLE "question_reviews" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "question_id" uuid NOT NULL,
        "reviewer_id" uuid NOT NULL,
        "action" "question_review_action_enum" NOT NULL,
        "feedback" text NULL,
        "version" integer NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_question_reviews_question_id" FOREIGN KEY ("question_id")
          REFERENCES "questions"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_question_reviews_reviewer_id" FOREIGN KEY ("reviewer_id")
          REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_question_reviews_qid_created"
      ON "question_reviews" ("question_id", "created_at" DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_question_reviews_reviewer_id"
      ON "question_reviews" ("reviewer_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_question_reviews_created_at"
      ON "question_reviews" ("created_at")
    `);

    // 7. Create import_jobs table (Batch Excel/ZIP tracking)
    await queryRunner.query(`
      CREATE TABLE "import_jobs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "file_name" varchar(255) NOT NULL,
        "file_url" text NULL,
        "file_type" varchar(50) NOT NULL,
        "status" "import_job_status_enum" NOT NULL DEFAULT 'pending',
        "target_status" "questions_status_enum" NOT NULL DEFAULT 'draft',
        "total_rows" integer NOT NULL DEFAULT 0,
        "success_count" integer NOT NULL DEFAULT 0,
        "error_count" integer NOT NULL DEFAULT 0,
        "created_groups_count" integer NOT NULL DEFAULT 0,
        "error_details" jsonb NULL,
        "created_by" uuid NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "completed_at" timestamptz NULL,
        CONSTRAINT "FK_import_jobs_created_by" FOREIGN KEY ("created_by")
          REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_import_jobs_created_by"
      ON "import_jobs" ("created_by")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_import_jobs_status"
      ON "import_jobs" ("status")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_import_jobs_created_at"
      ON "import_jobs" ("created_at")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Drop created tables
    await queryRunner.query(`DROP TABLE IF EXISTS "import_jobs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "question_reviews"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "question_histories"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "media_resources"`);

    // 2. Drop new ENUM types
    await queryRunner.query(`DROP TYPE IF EXISTS "import_job_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "question_review_action_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "question_history_change_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "media_resource_type_enum"`);

    // 3. Drop version column from questions
    await queryRunner.query(`ALTER TABLE "questions" DROP COLUMN IF EXISTS "version"`);

    // 4. Safely revert questions_status_enum on PostgreSQL
    // Update any non-draft status back to 'draft' before reverting enum
    await queryRunner.query(`UPDATE "questions" SET "status" = 'draft' WHERE "status" != 'draft'`);
    await queryRunner.query(`CREATE TYPE "questions_status_enum_old" AS ENUM ('draft')`);
    await queryRunner.query(`
      ALTER TABLE "questions"
      ALTER COLUMN "status" DROP DEFAULT,
      ALTER COLUMN "status" TYPE "questions_status_enum_old" USING "status"::text::"questions_status_enum_old",
      ALTER COLUMN "status" SET DEFAULT 'draft'
    `);
    await queryRunner.query(`DROP TYPE "questions_status_enum"`);
    await queryRunner.query(
      `ALTER TYPE "questions_status_enum_old" RENAME TO "questions_status_enum"`,
    );
  }
}
