import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPersonalFieldsToUserProfiles1788000007000 implements MigrationInterface {
  name = 'AddPersonalFieldsToUserProfiles1788000007000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "user_profiles_gender_enum" AS ENUM ('male', 'female', 'other')`,
    );
    await queryRunner.query(`ALTER TABLE "user_profiles" ADD "birthday" date`);
    await queryRunner.query(`ALTER TABLE "user_profiles" ADD "gender" "user_profiles_gender_enum"`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user_profiles" DROP COLUMN "gender"`);
    await queryRunner.query(`ALTER TABLE "user_profiles" DROP COLUMN "birthday"`);
    await queryRunner.query(`DROP TYPE "user_profiles_gender_enum"`);
  }
}
