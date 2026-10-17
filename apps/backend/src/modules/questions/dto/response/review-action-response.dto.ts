import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuestionStatus } from '../../enums/question-status.enum';

export class ReviewActionResponseDto {
  @ApiProperty({ description: 'Question UUID', example: 'd0a7a3b3-1e5b-42c2-841f-13a863c3d5e2' })
  id!: string;

  @ApiProperty({
    description: 'New question status',
    enum: QuestionStatus,
    example: QuestionStatus.PUBLISHED,
  })
  status!: QuestionStatus;

  @ApiProperty({ description: 'Updated optimistic locking version', example: 2 })
  version!: number;

  @ApiPropertyOptional({ description: 'Review action feedback or note', nullable: true })
  feedback?: string | null;

  @ApiProperty({
    description: 'Timestamp when review action was executed',
    example: '2026-10-16T15:00:00.000Z',
  })
  updatedAt!: Date;
}
