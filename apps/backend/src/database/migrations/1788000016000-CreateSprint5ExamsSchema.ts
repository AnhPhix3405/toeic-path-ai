import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSprint5ExamsSchema1788000016000 implements MigrationInterface {
  name = 'CreateSprint5ExamsSchema1788000016000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create ENUM types for Sprint 5 Exams Module
    await queryRunner.query(
      `CREATE TYPE "exam_type_enum" AS ENUM ('full_test', 'mini_test', 'placement_test')`,
    );
    await queryRunner.query(
      `CREATE TYPE "exam_status_enum" AS ENUM ('draft', 'published', 'closed', 'archived')`,
    );
    await queryRunner.query(
      `CREATE TYPE "score_conversion_type_enum" AS ENUM ('DEFAULT_ETS', 'CUSTOM', 'RAW_PERCENTAGE')`,
    );

    // 2. Create exams table
    await queryRunner.query(`
      CREATE TABLE "exams" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "title" varchar(255) NOT NULL,
        "description" text NULL,
        "type" "exam_type_enum" NOT NULL,
        "duration_minutes" integer NOT NULL,
        "max_attempts" integer NULL,
        "passing_score" integer NULL,
        "open_at" timestamptz NULL,
        "close_at" timestamptz NULL,
        "allow_part_practice" boolean NOT NULL DEFAULT true,
        "is_shuffled_questions" boolean NOT NULL DEFAULT false,
        "is_shuffled_options" boolean NOT NULL DEFAULT false,
        "score_conversion_type" "score_conversion_type_enum" NOT NULL DEFAULT 'DEFAULT_ETS',
        "status" "exam_status_enum" NOT NULL DEFAULT 'draft',
        "published_at" timestamptz NULL,
        "version" integer NOT NULL DEFAULT 1,
        "is_deleted" boolean NOT NULL DEFAULT false,
        "deleted_at" timestamptz NULL,
        "created_by" uuid NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_exams_created_by" FOREIGN KEY ("created_by")
          REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "chk_exams_duration" CHECK ("duration_minutes" >= 1 AND "duration_minutes" <= 300),
        CONSTRAINT "chk_exams_schedule" CHECK ("close_at" IS NULL OR "open_at" IS NULL OR "close_at" > "open_at"),
        CONSTRAINT "chk_exams_max_attempts" CHECK ("max_attempts" IS NULL OR "max_attempts" >= 0),
        CONSTRAINT "chk_exams_passing_score" CHECK ("passing_score" IS NULL OR ("passing_score" >= 0 AND "passing_score" <= 990))
      )
    `);

    // Indexes for exams table
    await queryRunner.query(`
      CREATE INDEX "IDX_exams_catalog_active"
      ON "exams" ("status", "is_deleted", "open_at", "close_at")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_exams_manage_creator"
      ON "exams" ("created_by", "status", "is_deleted")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_exams_created_at"
      ON "exams" ("created_at")
    `);

    // 3. Create exam_sections table
    await queryRunner.query(`
      CREATE TABLE "exam_sections" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "exam_id" uuid NOT NULL,
        "part_id" uuid NOT NULL,
        "target_questions_count" integer NOT NULL,
        "target_duration_minutes" integer NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_exam_sections_exam_id" FOREIGN KEY ("exam_id")
          REFERENCES "exams"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_exam_sections_part_id" FOREIGN KEY ("part_id")
          REFERENCES "toeic_parts"("id") ON DELETE RESTRICT,
        CONSTRAINT "UQ_exam_sections_exam_part" UNIQUE ("exam_id", "part_id"),
        CONSTRAINT "chk_exam_sections_count" CHECK ("target_questions_count" >= 1),
        CONSTRAINT "chk_exam_sections_duration" CHECK ("target_duration_minutes" IS NULL OR "target_duration_minutes" >= 1)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_exam_sections_exam_id"
      ON "exam_sections" ("exam_id")
    `);

    // 4. Create exam_questions table with DEFERRABLE unique constraint
    await queryRunner.query(`
      CREATE TABLE "exam_questions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "exam_id" uuid NOT NULL,
        "exam_section_id" uuid NOT NULL,
        "question_id" uuid NOT NULL,
        "question_group_id" uuid NULL,
        "group_order" integer NULL,
        "order_index" integer NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_exam_questions_exam_id" FOREIGN KEY ("exam_id")
          REFERENCES "exams"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_exam_questions_section_id" FOREIGN KEY ("exam_section_id")
          REFERENCES "exam_sections"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_exam_questions_question_id" FOREIGN KEY ("question_id")
          REFERENCES "questions"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_exam_questions_group_id" FOREIGN KEY ("question_group_id")
          REFERENCES "question_groups"("id") ON DELETE SET NULL,
        CONSTRAINT "UQ_exam_questions_exam_question" UNIQUE ("exam_id", "question_id"),
        CONSTRAINT "uq_exam_question_order" UNIQUE ("exam_id", "order_index") DEFERRABLE INITIALLY DEFERRED,
        CONSTRAINT "chk_exam_questions_order" CHECK ("order_index" >= 1),
        CONSTRAINT "chk_exam_questions_group_order" CHECK ("group_order" IS NULL OR "group_order" >= 1)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_exam_questions_exam_id"
      ON "exam_questions" ("exam_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_exam_questions_section_id"
      ON "exam_questions" ("exam_section_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_exam_questions_group_id"
      ON "exam_questions" ("exam_id", "question_group_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_exam_questions_order"
      ON "exam_questions" ("exam_id", "order_index")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Drop tables in reverse dependency order
    await queryRunner.query(`DROP TABLE IF EXISTS "exam_questions" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "exam_sections" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "exams" CASCADE;`);

    // 2. Drop ENUM types
    await queryRunner.query(`DROP TYPE IF EXISTS "score_conversion_type_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "exam_status_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "exam_type_enum";`);
  }
}
