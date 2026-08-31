import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuthSessionCleanupIndexes1788000002000 implements MigrationInterface {
  name = 'AddAuthSessionCleanupIndexes1788000002000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS auth_sessions_expires_at_idx
      ON auth_sessions (expires_at)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS auth_sessions_revoked_at_idx
      ON auth_sessions (revoked_at)
      WHERE revoked_at IS NOT NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS auth_sessions_revoked_at_idx');
    await queryRunner.query('DROP INDEX IF EXISTS auth_sessions_expires_at_idx');
  }
}
