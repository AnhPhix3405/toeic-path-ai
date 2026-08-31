import type { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameReplacedBySessionIdToPreviousSessionId1788000003000 implements MigrationInterface {
  name = 'RenameReplacedBySessionIdToPreviousSessionId1788000003000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE auth_sessions
      RENAME COLUMN replaced_by_session_id TO previous_session_id
    `);
    await queryRunner.query(`
      ALTER TABLE auth_sessions
      RENAME CONSTRAINT "FK_auth_sessions_replacement" TO "FK_auth_sessions_previous_session"
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE auth_sessions
      RENAME CONSTRAINT "FK_auth_sessions_previous_session" TO "FK_auth_sessions_replacement"
    `);
    await queryRunner.query(`
      ALTER TABLE auth_sessions
      RENAME COLUMN previous_session_id TO replaced_by_session_id
    `);
  }
}
