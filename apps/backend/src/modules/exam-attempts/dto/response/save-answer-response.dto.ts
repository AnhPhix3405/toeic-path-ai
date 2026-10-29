import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SaveAnswerResponseDto {
  @ApiProperty({
    description: 'Trạng thái lưu câu trả lời thành công',
    example: true,
  })
  success!: boolean;

  @ApiProperty({
    description: 'ID của câu hỏi vừa lưu',
    example: '20000000-0000-4000-8000-000000000001',
  })
  questionId!: string;

  @ApiPropertyOptional({
    description: 'ID của phương án đang chọn (null nếu câu hỏi chưa chọn hoặc đã bỏ chọn)',
    example: '30000000-0000-4000-8000-000000000001',
    nullable: true,
  })
  selectedOptionId!: string | null;

  @ApiProperty({
    description: 'Trạng thái cờ đánh dấu xem lại',
    example: false,
  })
  isMarkedForReview!: boolean;

  @ApiProperty({
    description: 'Tổng số câu hỏi đã trả lời hiện tại của lượt thi',
    example: 45,
  })
  answeredCount!: number;

  @ApiProperty({
    description: 'Số giây còn lại của bài thi đồng bộ từ server',
    example: 5400,
  })
  remainingSeconds!: number;

  @ApiProperty({
    description: 'Thời điểm server lưu bản ghi',
    example: '2026-11-01T08:15:30.000Z',
  })
  savedAt!: Date;
}
