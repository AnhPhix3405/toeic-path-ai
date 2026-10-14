import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeQuestionAndOptionContentNullable1788000015000 implements MigrationInterface {
  name = 'MakeQuestionAndOptionContentNullable1788000015000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "questions" ALTER COLUMN "content" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "question_options" ALTER COLUMN "content" DROP NOT NULL`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE "questions" SET "content" = '' WHERE "content" IS NULL`);
    await queryRunner.query(`ALTER TABLE "questions" ALTER COLUMN "content" SET NOT NULL`);
    await queryRunner.query(`UPDATE "question_options" SET "content" = '' WHERE "content" IS NULL`);
    await queryRunner.query(`ALTER TABLE "question_options" ALTER COLUMN "content" SET NOT NULL`);
  }
}
