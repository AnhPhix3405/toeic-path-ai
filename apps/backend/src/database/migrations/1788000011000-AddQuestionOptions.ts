import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class AddQuestionOptions1788000011000 implements MigrationInterface {
  name = 'AddQuestionOptions1788000011000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'questions',
      new TableColumn({ name: 'explanation', type: 'text', isNullable: true }),
    );
    await queryRunner.createTable(
      new Table({
        name: 'question_options',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
          { name: 'question_id', type: 'uuid' },
          { name: 'label', type: 'varchar', length: '10' },
          { name: 'content', type: 'text' },
          { name: 'is_correct', type: 'boolean', default: 'false' },
          { name: 'position', type: 'integer' },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
          { name: 'updated_at', type: 'timestamptz', default: 'now()' },
        ],
      }),
    );
    await queryRunner.createForeignKey(
      'question_options',
      new TableForeignKey({
        name: 'FK_question_options_question_id',
        columnNames: ['question_id'],
        referencedTableName: 'questions',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
    await queryRunner.createIndex(
      'question_options',
      new TableIndex({ name: 'IDX_question_options_question_id', columnNames: ['question_id'] }),
    );
    await queryRunner.createIndex(
      'question_options',
      new TableIndex({
        name: 'UQ_question_options_question_id_position',
        columnNames: ['question_id', 'position'],
        isUnique: true,
      }),
    );
    await queryRunner.createIndex(
      'question_options',
      new TableIndex({
        name: 'UQ_question_options_question_id_label',
        columnNames: ['question_id', 'label'],
        isUnique: true,
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('question_options');
    await queryRunner.dropColumn('questions', 'explanation');
  }
}
