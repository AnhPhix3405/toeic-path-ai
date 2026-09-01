import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreatePasswordResetTokensTable1788000006000 implements MigrationInterface {
  name = 'CreatePasswordResetTokensTable1788000006000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'password_reset_tokens',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
          { name: 'user_id', type: 'uuid' },
          { name: 'token_hash', type: 'varchar', length: '64', isUnique: true },
          { name: 'expires_at', type: 'timestamptz' },
          { name: 'used_at', type: 'timestamptz', isNullable: true },
          { name: 'revoked_at', type: 'timestamptz', isNullable: true },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
        ],
      }),
    );
    await queryRunner.createForeignKey(
      'password_reset_tokens',
      new TableForeignKey({
        name: 'FK_password_reset_tokens_user',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
    await queryRunner.createIndex(
      'password_reset_tokens',
      new TableIndex({ name: 'IDX_password_reset_tokens_user_id', columnNames: ['user_id'] }),
    );
    await queryRunner.createIndex(
      'password_reset_tokens',
      new TableIndex({ name: 'IDX_password_reset_tokens_expires_at', columnNames: ['expires_at'] }),
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_password_reset_tokens_active" ON "password_reset_tokens" ("token_hash", "expires_at") WHERE "used_at" IS NULL AND "revoked_at" IS NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('password_reset_tokens');
  }
}
