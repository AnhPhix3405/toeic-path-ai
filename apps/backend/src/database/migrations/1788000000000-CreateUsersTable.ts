import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateUsersTable1788000000000 implements MigrationInterface {
  name = 'CreateUsersTable1788000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "users_role_enum" AS ENUM ('student', 'teacher', 'admin')`,
    );
    await queryRunner.query(`CREATE TYPE "users_status_enum" AS ENUM ('active', 'locked')`);
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          { name: 'email', type: 'varchar', length: '255', isUnique: true },
          { name: 'password_hash', type: 'varchar', length: '255' },
          {
            name: 'role',
            type: 'enum',
            enumName: 'users_role_enum',
            enum: ['student', 'teacher', 'admin'],
            default: "'student'",
          },
          {
            name: 'status',
            type: 'enum',
            enumName: 'users_status_enum',
            enum: ['active', 'locked'],
            default: "'active'",
          },
          {
            name: 'email_verified_at',
            type: 'timestamptz',
            isNullable: true,
          },
          { name: 'last_login_at', type: 'timestamptz', isNullable: true },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
          { name: 'updated_at', type: 'timestamptz', default: 'now()' },
        ],
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('users');
    await queryRunner.query('DROP TYPE "users_status_enum"');
    await queryRunner.query('DROP TYPE "users_role_enum"');
  }
}
