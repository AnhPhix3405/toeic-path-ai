import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddTermsAcceptanceToUsers1788000004000 implements MigrationInterface {
  name = 'AddTermsAcceptanceToUsers1788000004000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('users', [
      new TableColumn({ name: 'terms_accepted_at', type: 'timestamptz', isNullable: true }),
      new TableColumn({ name: 'terms_version', type: 'varchar', length: '30', isNullable: true }),
    ]);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'terms_version');
    await queryRunner.dropColumn('users', 'terms_accepted_at');
  }
}
