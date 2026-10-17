import { ApiProperty } from '@nestjs/swagger';

export class SkippedReviewItemDto {
  @ApiProperty({
    description: 'Question UUID that was skipped',
    example: 'd0a7a3b3-1e5b-42c2-841f-13a863c3d5e2',
  })
  questionId!: string;

  @ApiProperty({
    description: 'Reason why this question was skipped in batch review',
    example: 'Maker-Checker violation or concurrency mismatch',
  })
  reason!: string;
}

export class BatchReviewResponseDto {
  @ApiProperty({ description: 'Number of successfully approved questions', example: 5 })
  approvedCount!: number;

  @ApiProperty({
    description: 'List of skipped items with failure reasons',
    type: [SkippedReviewItemDto],
  })
  skipped!: SkippedReviewItemDto[];
}
