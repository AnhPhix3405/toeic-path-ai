import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateQuestionsTable1788000009000 implements MigrationInterface {
  name = 'CreateQuestionsTable1788000009000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "questions_question_type_enum" AS ENUM ('single_choice')`);
    await queryRunner.query(`CREATE TYPE "questions_status_enum" AS ENUM ('draft')`);
    await queryRunner.createTable(
      new Table({
        name: 'questions',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
          { name: 'content', type: 'text' },
          {
            name: 'question_type',
            type: 'enum',
            enumName: 'questions_question_type_enum',
            enum: ['single_choice'],
          },
          {
            name: 'status',
            type: 'enum',
            enumName: 'questions_status_enum',
            enum: ['draft'],
            default: "'draft'",
          },
          { name: 'created_by', type: 'uuid' },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
          { name: 'updated_at', type: 'timestamptz', default: 'now()' },
        ],
      }),
    );
    await queryRunner.createForeignKey(
      'questions',
      new TableForeignKey({
        name: 'FK_questions_created_by_users',
        columnNames: ['created_by'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );
    await queryRunner.createIndex(
      'questions',
      new TableIndex({ name: 'IDX_questions_created_at', columnNames: ['created_at'] }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('questions');
    await queryRunner.query('DROP TYPE "questions_status_enum"');
    await queryRunner.query('DROP TYPE "questions_question_type_enum"');
  }
}
