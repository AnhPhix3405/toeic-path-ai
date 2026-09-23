import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGoogleAuthToUsers1788000013000 implements MigrationInterface {
  name = 'AddGoogleAuthToUsers1788000013000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "users_auth_provider_enum" AS ENUM ('local', 'google')`);
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "auth_provider" "users_auth_provider_enum" NOT NULL DEFAULT 'local',
      ADD COLUMN "provider_id" varchar(255) NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "password_hash" DROP NOT NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_users_auth_provider_provider_id"
      ON "users" ("auth_provider", "provider_id")
      WHERE "provider_id" IS NOT NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_auth_provider_provider_id"`);
    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "password_hash" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN "provider_id",
      DROP COLUMN "auth_provider"
    `);
    await queryRunner.query(`DROP TYPE IF EXISTS "users_auth_provider_enum"`);
  }
}
