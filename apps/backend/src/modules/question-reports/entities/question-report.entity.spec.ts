import { getMetadataArgsStorage, QueryRunner } from 'typeorm';
import { QuestionReportReason } from '../enums/question-report-reason.enum';
import { QuestionReportStatus } from '../enums/question-report-status.enum';
import { QuestionReport } from './question-report.entity';
import { QuestionReportsModule } from '../question-reports.module';
import { AddSprint7GradingAndQuestionReportsSchema1788000018000 } from '../../../database/migrations/1788000018000-AddSprint7GradingAndQuestionReportsSchema';

describe('Sprint 7 QuestionReport Enums, Entity & Module', () => {
  it('should define all 5 QuestionReportReason values', () => {
    expect(QuestionReportReason.WRONG_ANSWER).toBe('wrong_answer');
    expect(QuestionReportReason.TYPO_ERROR).toBe('typo_error');
    expect(QuestionReportReason.BROKEN_MEDIA).toBe('broken_media');
    expect(QuestionReportReason.UNCLEAR_EXPLANATION).toBe('unclear_explanation');
    expect(QuestionReportReason.OTHER).toBe('other');
  });

  it('should define all 4 QuestionReportStatus values', () => {
    expect(QuestionReportStatus.PENDING).toBe('pending');
    expect(QuestionReportStatus.IN_REVIEW).toBe('in_review');
    expect(QuestionReportStatus.RESOLVED).toBe('resolved');
    expect(QuestionReportStatus.REJECTED).toBe('rejected');
  });

  it('should instantiate QuestionReport with safe default values (PMR 028)', () => {
    const report = new QuestionReport();
    report.questionId = '11111111-1111-4111-8111-111111111111';
    report.reporterId = '22222222-2222-4222-8222-222222222222';
    report.reason = QuestionReportReason.WRONG_ANSWER;

    expect(report.status).toBe(QuestionReportStatus.PENDING);
    expect(report.attemptId).toBeNull();
    expect(report.description).toBeNull();
    expect(report.resolvedById).toBeNull();
    expect(report.resolvedAt).toBeNull();
    expect(report.resolutionNote).toBeNull();
  });

  it('should configure Partial Unique Index uq_reporter_open_question_report and FK onDelete policies on QuestionReport', () => {
    const indices = getMetadataArgsStorage().indices.filter((i) => i.target === QuestionReport);
    const partialUniqueIdx = indices.find((i) => i.name === 'uq_reporter_open_question_report');
    expect(partialUniqueIdx).toBeDefined();
    expect(partialUniqueIdx?.unique).toBe(true);
    expect(partialUniqueIdx?.where).toBe("status IN ('pending', 'in_review')");

    const relations = getMetadataArgsStorage().relations.filter((r) => r.target === QuestionReport);
    const relationMap = new Map(relations.map((r) => [r.propertyName, r.options?.onDelete]));
    expect(relationMap.get('question')).toBe('RESTRICT');
    expect(relationMap.get('reporter')).toBe('RESTRICT');
    expect(relationMap.get('attempt')).toBe('SET NULL');
    expect(relationMap.get('resolvedBy')).toBe('SET NULL');
  });

  it('should define QuestionReportsModule', () => {
    expect(QuestionReportsModule).toBeDefined();
  });

  it('should execute up() and down() SQL queries cleanly in AddSprint7GradingAndQuestionReportsSchema1788000018000', async () => {
    const migration = new AddSprint7GradingAndQuestionReportsSchema1788000018000();
    const executedQueries: string[] = [];
    const mockQueryRunner = {
      query: jest.fn(async (sql: string) => {
        executedQueries.push(sql);
      }),
    } as unknown as QueryRunner;

    await migration.up(mockQueryRunner);
    expect(executedQueries.some((q) => q.includes('ALTER TABLE "exam_attempts"'))).toBe(true);
    expect(executedQueries.some((q) => q.includes('ADD COLUMN "is_correct" boolean NULL'))).toBe(
      true,
    );
    expect(executedQueries.some((q) => q.includes('CREATE TABLE "question_reports"'))).toBe(true);
    expect(
      executedQueries.some((q) =>
        q.includes('CREATE UNIQUE INDEX "uq_reporter_open_question_report"'),
      ),
    ).toBe(true);

    executedQueries.length = 0;
    await migration.down(mockQueryRunner);
    expect(executedQueries.some((q) => q.includes('DROP TABLE IF EXISTS "question_reports"'))).toBe(
      true,
    );
    expect(
      executedQueries.some((q) =>
        q.includes('DROP TYPE IF EXISTS "question_report_status_enum" CASCADE'),
      ),
    ).toBe(true);
    expect(executedQueries.some((q) => q.includes('DROP COLUMN IF EXISTS "is_correct"'))).toBe(
      true,
    );
    expect(
      executedQueries.some((q) => q.includes('DROP COLUMN IF EXISTS "duration_spent_seconds"')),
    ).toBe(true);
  });
});
