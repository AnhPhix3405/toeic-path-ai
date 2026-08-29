import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateAuthSessionsTable1788000001000 implements MigrationInterface {
  name = 'CreateAuthSessionsTable1788000001000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'auth_sessions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          { name: 'user_id', type: 'uuid' },
          { name: 'refresh_token_hash', type: 'varchar', length: '255' },
          { name: 'expires_at', type: 'timestamptz' },
          { name: 'revoked_at', type: 'timestamptz', isNullable: true },
          {
            name: 'replaced_by_session_id',
            type: 'uuid',
            isNullable: true,
          },
          { name: 'user_agent', type: 'text', isNullable: true },
          { name: 'ip_address', type: 'varchar', length: '45', isNullable: true },
          { name: 'last_used_at', type: 'timestamptz', isNullable: true },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
        ],
      }),
    );
    await queryRunner.createForeignKey(
      'auth_sessions',
      new TableForeignKey({
        name: 'FK_auth_sessions_user',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
    await queryRunner.createForeignKey(
      'auth_sessions',
      new TableForeignKey({
        name: 'FK_auth_sessions_replacement',
        columnNames: ['replaced_by_session_id'],
        referencedTableName: 'auth_sessions',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );
    await queryRunner.createIndex(
      'auth_sessions',
      new TableIndex({ name: 'IDX_auth_sessions_user_id', columnNames: ['user_id'] }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('auth_sessions');
  }
}
