import { ApiProperty } from '@nestjs/swagger';

export class SkippedReviewItemDto {
  @ApiProperty({ description: 'ID của câu hỏi bị bỏ qua', example: 'uuid' })
  id!: string;

  @ApiProperty({
    description: 'Lý do bị bỏ qua khi gửi duyệt',
    example: 'Nhóm câu hỏi có câu con chưa hoàn thiện hoặc trạng thái không hợp lệ.',
  })
  reason!: string;
}

export class SubmitForReviewResponseDto {
  @ApiProperty({
    description: 'Số lượng câu hỏi đã chuyển thành công sang pending_review',
    example: 6,
  })
  submittedCount!: number;

  @ApiProperty({
    description: 'Danh sách ID các câu hỏi đã được gửi duyệt',
    type: [String],
    example: ['uuid-1', 'uuid-2'],
  })
  submittedIds!: string[];

  @ApiProperty({
    description: 'Danh sách các câu hỏi bị bỏ qua cùng lý do',
    type: [SkippedReviewItemDto],
  })
  skipped!: SkippedReviewItemDto[];
}
