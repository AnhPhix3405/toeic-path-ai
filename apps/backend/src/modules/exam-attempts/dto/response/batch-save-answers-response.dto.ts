import { ApiProperty } from '@nestjs/swagger';

export class FailedBatchItemDto {
  @ApiProperty({
    description: 'ID của câu hỏi không hợp lệ bị từ chối',
    example: '20000000-0000-4000-8000-000000000099',
  })
  questionId!: string;

  @ApiProperty({
    description: 'Mã lỗi lý do từ chối (ERR_QUESTION_NOT_IN_ATTEMPT, ERR_INVALID_OPTION_CHOICE)',
    example: 'ERR_QUESTION_NOT_IN_ATTEMPT',
  })
  reason!: string;
}

export class BatchSaveAnswersResponseDto {
  @ApiProperty({
    description: 'Trạng thái xử lý lô',
    example: true,
  })
  success!: boolean;

  @ApiProperty({
    description: 'Số câu trả lời đã đồng bộ thành công vào CSDL',
    example: 45,
  })
  syncedCount!: number;

  @ApiProperty({
    description: 'Số câu bị từ chối do không hợp lệ',
    example: 0,
  })
  failedCount!: number;

  @ApiProperty({
    description: 'Danh sách chi tiết các câu bị từ chối (nếu có)',
    type: [FailedBatchItemDto],
  })
  failedItems!: FailedBatchItemDto[];

  @ApiProperty({
    description: 'Tổng số câu đã trả lời hiện tại của lượt thi',
    example: 45,
  })
  answeredCount!: number;

  @ApiProperty({
    description: 'Số giây còn lại đồng bộ từ server',
    example: 5400,
  })
  remainingSeconds!: number;

  @ApiProperty({
    description: 'Thời điểm server hiện tại',
    example: '2026-11-01T08:15:30.000Z',
  })
  serverTimeNow!: Date;
}
