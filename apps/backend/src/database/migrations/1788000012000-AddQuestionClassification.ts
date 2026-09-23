import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class AddQuestionClassification1788000012000 implements MigrationInterface {
  name = 'AddQuestionClassification1788000012000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'toeic_parts',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
          { name: 'part_number', type: 'smallint', isUnique: true },
          { name: 'name', type: 'varchar', length: '100' },
          { name: 'description', type: 'text', isNullable: true },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
          { name: 'updated_at', type: 'timestamptz', default: 'now()' },
        ],
        checks: [
          { name: 'CHK_toeic_parts_part_number', expression: 'part_number BETWEEN 1 AND 7' },
        ],
      }),
    );
    await queryRunner.createTable(this.createTaxonomyTable('topics'));
    await queryRunner.createTable(this.createTaxonomyTable('skills'));

    await queryRunner.query(
      `CREATE TYPE "questions_difficulty_enum" AS ENUM ('easy', 'medium', 'hard')`,
    );
    await queryRunner.addColumn(
      'questions',
      new TableColumn({ name: 'part_id', type: 'uuid', isNullable: true }),
    );
    await queryRunner.addColumn(
      'questions',
      new TableColumn({
        name: 'difficulty',
        type: 'enum',
        enumName: 'questions_difficulty_enum',
        enum: ['easy', 'medium', 'hard'],
        isNullable: true,
      }),
    );
    await queryRunner.createForeignKey(
      'questions',
      new TableForeignKey({
        name: 'FK_questions_part_id',
        columnNames: ['part_id'],
        referencedTableName: 'toeic_parts',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );
    await queryRunner.createIndex(
      'questions',
      new TableIndex({ name: 'IDX_questions_part_id', columnNames: ['part_id'] }),
    );
    await queryRunner.createIndex(
      'questions',
      new TableIndex({ name: 'IDX_questions_difficulty', columnNames: ['difficulty'] }),
    );

    await this.createJunctionTable(queryRunner, 'question_topics', 'topic_id', 'topics');
    await this.createJunctionTable(queryRunner, 'question_skills', 'skill_id', 'skills');
    await this.seedCatalogs(queryRunner);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('question_skills');
    await queryRunner.dropTable('question_topics');
    await queryRunner.dropForeignKey('questions', 'FK_questions_part_id');
    await queryRunner.dropIndex('questions', 'IDX_questions_difficulty');
    await queryRunner.dropIndex('questions', 'IDX_questions_part_id');
    await queryRunner.dropColumn('questions', 'difficulty');
    await queryRunner.dropColumn('questions', 'part_id');
    await queryRunner.query('DROP TYPE "questions_difficulty_enum"');
    await queryRunner.dropTable('skills');
    await queryRunner.dropTable('topics');
    await queryRunner.dropTable('toeic_parts');
  }

  private createTaxonomyTable(name: string): Table {
    return new Table({
      name,
      columns: [
        { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
        { name: 'code', type: 'varchar', length: '100', isUnique: true },
        { name: 'name', type: 'varchar', length: '100', isUnique: true },
        { name: 'description', type: 'text', isNullable: true },
        { name: 'created_at', type: 'timestamptz', default: 'now()' },
        { name: 'updated_at', type: 'timestamptz', default: 'now()' },
      ],
    });
  }

  private async createJunctionTable(
    queryRunner: QueryRunner,
    tableName: string,
    referenceColumn: string,
    referenceTable: string,
  ): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: tableName,
        columns: [
          { name: 'question_id', type: 'uuid', isPrimary: true },
          { name: referenceColumn, type: 'uuid', isPrimary: true },
        ],
        foreignKeys: [
          {
            name: `FK_${tableName}_question_id`,
            columnNames: ['question_id'],
            referencedTableName: 'questions',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            name: `FK_${tableName}_${referenceColumn}`,
            columnNames: [referenceColumn],
            referencedTableName: referenceTable,
            referencedColumnNames: ['id'],
            onDelete: 'RESTRICT',
          },
        ],
        indices: [
          { name: `IDX_${tableName}_question_id`, columnNames: ['question_id'] },
          { name: `IDX_${tableName}_${referenceColumn}`, columnNames: [referenceColumn] },
        ],
      }),
    );
  }

  private async seedCatalogs(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "toeic_parts" ("part_number", "name") VALUES
        (1, 'Photographs'),
        (2, 'Question-Response'),
        (3, 'Conversations'),
        (4, 'Talks'),
        (5, 'Incomplete Sentences'),
        (6, 'Text Completion'),
        (7, 'Reading Comprehension')
      ON CONFLICT ("part_number") DO UPDATE
        SET "name" = EXCLUDED."name", "updated_at" = now()
    `);
    await queryRunner.query(`
      INSERT INTO "topics" ("code", "name") VALUES
        ('business', 'Business'),
        ('office', 'Office'),
        ('travel', 'Travel'),
        ('shopping', 'Shopping'),
        ('transportation', 'Transportation'),
        ('technology', 'Technology')
      ON CONFLICT ("code") DO UPDATE
        SET "name" = EXCLUDED."name", "updated_at" = now()
    `);
    await queryRunner.query(`
      INSERT INTO "skills" ("code", "name") VALUES
        ('grammar', 'Grammar'),
        ('vocabulary', 'Vocabulary'),
        ('listening-comprehension', 'Listening Comprehension'),
        ('reading-comprehension', 'Reading Comprehension'),
        ('inference', 'Inference'),
        ('detail-recognition', 'Detail Recognition')
      ON CONFLICT ("code") DO UPDATE
        SET "name" = EXCLUDED."name", "updated_at" = now()
    `);
  }
}
