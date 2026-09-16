import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateQuestionGroups1788000010000 implements MigrationInterface {
  name = 'CreateQuestionGroups1788000010000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'question_groups',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
          { name: 'title', type: 'varchar', length: '255', isNullable: true },
          { name: 'context', type: 'text' },
          { name: 'created_by', type: 'uuid' },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
          { name: 'updated_at', type: 'timestamptz', default: 'now()' },
        ],
      }),
    );
    await queryRunner.createForeignKey(
      'question_groups',
      new TableForeignKey({
        name: 'FK_question_groups_created_by_users',
        columnNames: ['created_by'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );
    await queryRunner.createIndex(
      'question_groups',
      new TableIndex({ name: 'IDX_question_groups_created_by', columnNames: ['created_by'] }),
    );
    await queryRunner.addColumn(
      'questions',
      new TableColumn({ name: 'question_group_id', type: 'uuid', isNullable: true }),
    );
    await queryRunner.addColumn(
      'questions',
      new TableColumn({ name: 'group_order', type: 'integer', isNullable: true }),
    );
    await queryRunner.createForeignKey(
      'questions',
      new TableForeignKey({
        name: 'FK_questions_question_group_id',
        columnNames: ['question_group_id'],
        referencedTableName: 'question_groups',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );
    await queryRunner.createIndex(
      'questions',
      new TableIndex({
        name: 'IDX_questions_question_group_id',
        columnNames: ['question_group_id'],
      }),
    );
    await queryRunner.query(
      'ALTER TABLE "questions" ADD CONSTRAINT "CHK_questions_group_assignment" CHECK ((question_group_id IS NULL AND group_order IS NULL) OR (question_group_id IS NOT NULL AND group_order IS NOT NULL AND group_order > 0))',
    );
    await queryRunner.createIndex(
      'questions',
      new TableIndex({
        name: 'UQ_questions_question_group_id_group_order',
        columnNames: ['question_group_id', 'group_order'],
        isUnique: true,
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "questions" DROP CONSTRAINT "CHK_questions_group_assignment"',
    );
    await queryRunner.dropForeignKey('questions', 'FK_questions_question_group_id');
    await queryRunner.dropIndex('questions', 'UQ_questions_question_group_id_group_order');
    await queryRunner.dropIndex('questions', 'IDX_questions_question_group_id');
    await queryRunner.dropTable('question_groups');
    await queryRunner.dropColumn('questions', 'group_order');
    await queryRunner.dropColumn('questions', 'question_group_id');
  }
}
