import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuestionHistoryChangeType } from '../../enums/question-history-change-type.enum';

export class QuestionHistoryResponseDto {
  @ApiProperty({
    description: 'History snapshot UUID',
    example: 'd0a7a3b3-1e5b-42c2-841f-13a863c3d5e2',
  })
  id!: string;

  @ApiProperty({ description: 'Question UUID', example: 'd0a7a3b3-1e5b-42c2-841f-13a863c3d5e2' })
  questionId!: string;

  @ApiProperty({ description: 'UUID of user who made this change', example: 'u-123' })
  changedBy!: string;

  @ApiProperty({
    description: 'Type of change performed',
    enum: QuestionHistoryChangeType,
    example: QuestionHistoryChangeType.QUICK_FIXED,
  })
  changeType!: QuestionHistoryChangeType;

  @ApiPropertyOptional({ description: 'State snapshot before change (JSON)', nullable: true })
  snapshotBefore!: Record<string, unknown> | null;

  @ApiProperty({ description: 'State snapshot after change (JSON)' })
  snapshotAfter!: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Audit comment or note', nullable: true })
  comment!: string | null;

  @ApiProperty({ description: 'Snapshot creation timestamp', example: '2026-10-16T15:00:00.000Z' })
  createdAt!: Date;
}
