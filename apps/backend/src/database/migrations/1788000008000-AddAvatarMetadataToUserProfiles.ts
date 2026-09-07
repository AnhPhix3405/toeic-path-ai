import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAvatarMetadataToUserProfiles1788000008000 implements MigrationInterface {
  name = 'AddAvatarMetadataToUserProfiles1788000008000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user_profiles" ADD "avatar_storage_key" varchar(500)`);
    await queryRunner.query(`ALTER TABLE "user_profiles" ADD "avatar_mime_type" varchar(100)`);
    await queryRunner.query(`ALTER TABLE "user_profiles" ADD "avatar_size_bytes" integer`);
    await queryRunner.query(
      `ALTER TABLE "user_profiles" ADD CONSTRAINT "CHK_user_profiles_avatar_consistency" CHECK (("avatar_url" IS NULL AND "avatar_storage_key" IS NULL) OR ("avatar_url" IS NOT NULL AND "avatar_storage_key" IS NOT NULL))`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_profiles" DROP CONSTRAINT "CHK_user_profiles_avatar_consistency"`,
    );
    await queryRunner.query(`ALTER TABLE "user_profiles" DROP COLUMN "avatar_size_bytes"`);
    await queryRunner.query(`ALTER TABLE "user_profiles" DROP COLUMN "avatar_mime_type"`);
    await queryRunner.query(`ALTER TABLE "user_profiles" DROP COLUMN "avatar_storage_key"`);
  }
}
