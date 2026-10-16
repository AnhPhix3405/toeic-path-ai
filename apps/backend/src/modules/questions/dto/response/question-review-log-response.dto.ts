import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuestionReviewAction } from '../../enums/question-review-action.enum';

export class QuestionReviewLogResponseDto {
  @ApiProperty({ description: 'Review log entry UUID', example: 'd0a7a3b3-1e5b-42c2-841f-13a863c3d5e2' })
  id!: string;

  @ApiProperty({ description: 'Question UUID', example: 'd0a7a3b3-1e5b-42c2-841f-13a863c3d5e2' })
  questionId!: string;

  @ApiProperty({ description: 'UUID of reviewer/checker', example: 'u-456' })
  reviewerId!: string;

  @ApiProperty({ description: 'Review action taken', enum: QuestionReviewAction, example: QuestionReviewAction.APPROVED })
  action!: QuestionReviewAction;

  @ApiPropertyOptional({ description: 'Review feedback or instructions', nullable: true })
  feedback!: string | null;

  @ApiProperty({ description: 'Question version at the time of review', example: 1 })
  version!: number;

  @ApiProperty({ description: 'Timestamp when review action was recorded', example: '2026-10-16T15:00:00.000Z' })
  createdAt!: Date;
}
