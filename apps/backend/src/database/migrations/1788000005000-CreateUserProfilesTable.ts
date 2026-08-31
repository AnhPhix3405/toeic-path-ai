import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateUserProfilesTable1788000005000 implements MigrationInterface {
  name = 'CreateUserProfilesTable1788000005000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'user_profiles',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
          { name: 'user_id', type: 'uuid', isNullable: false, isUnique: true },
          { name: 'full_name', type: 'varchar', length: '150', isNullable: false },
          { name: 'avatar_url', type: 'text', isNullable: true },
          { name: 'bio', type: 'varchar', length: '500', isNullable: true },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
          { name: 'updated_at', type: 'timestamptz', default: 'now()' },
        ],
        foreignKeys: [
          {
            name: 'FK_user_profiles_user_id',
            columnNames: ['user_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('user_profiles');
  }
}
