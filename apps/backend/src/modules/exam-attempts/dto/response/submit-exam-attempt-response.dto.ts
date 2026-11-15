import { ApiProperty } from '@nestjs/swagger';
import { ExamAttemptStatus } from '../../enums/exam-attempt-status.enum';

export class SubmitExamAttemptResponseDto {
  @ApiProperty({
    description: 'ID của lượt làm bài thi',
    example: '11111111-1111-4111-8111-111111111111',
  })
  attemptId!: string;

  @ApiProperty({
    description: 'Trạng thái lượt thi sau khi chốt bài (submitted hoặc timed_out)',
    enum: ExamAttemptStatus,
    example: ExamAttemptStatus.SUBMITTED,
  })
  status!: ExamAttemptStatus;

  @ApiProperty({
    description: 'Thời điểm ghi nhận nộp bài',
    example: '2026-11-15T09:00:00.000Z',
  })
  submittedAt!: Date;

  @ApiProperty({
    description: 'Thời gian thực tế làm bài (giây), bị chặn trần bởi allocatedSeconds',
    example: 3500,
  })
  durationSpentSeconds!: number;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'Tổng điểm quy đổi TOEIC (10–990; null cho part_practice hoặc RAW_PERCENTAGE)',
    example: 785,
  })
  totalScore!: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'Điểm kỹ năng Listening chuẩn ETS (5–495; null nếu không áp dụng)',
    example: 410,
  })
  listeningScore!: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'Điểm kỹ năng Reading chuẩn ETS (5–495; null nếu không áp dụng)',
    example: 375,
  })
  readingScore!: number | null;

  @ApiProperty({
    description: 'Số câu trả lời đúng',
    example: 158,
  })
  correctCount!: number;

  @ApiProperty({
    description: 'Số câu trả lời sai (đã chọn phương án nhưng sai)',
    example: 32,
  })
  wrongCount!: number;

  @ApiProperty({
    description: 'Số câu bỏ trống (chưa chọn phương án)',
    example: 10,
  })
  skippedCount!: number;

  @ApiProperty({
    description: 'Tổng số câu hỏi trong lượt thi',
    example: 200,
  })
  totalQuestions!: number;

  @ApiProperty({
    description: 'Tỷ lệ chính xác (0.00–100.00)',
    example: 79,
  })
  accuracyPercentage!: number;

  @ApiProperty({
    type: Boolean,
    nullable: true,
    description: 'Kết quả đạt/không đạt so với passingScore của đề thi (null nếu không áp dụng)',
    example: true,
  })
  isPassed!: boolean | null;
}
