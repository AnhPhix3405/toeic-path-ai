import { ApiProperty } from '@nestjs/swagger';
import { ExamAttemptStatus } from '../../enums/exam-attempt-status.enum';
import { PartPracticeMode } from '../../enums/part-practice-mode.enum';

export class ExamAttemptHistoryItemDto {
  @ApiProperty({
    example: '50000000-0000-4000-8000-000000000001',
    description: 'ID của lượt làm bài thi',
  })
  attemptId!: string;

  @ApiProperty({
    example: '10000000-0000-4000-8000-000000000001',
    description: 'ID của đề thi gốc',
  })
  examId!: string;

  @ApiProperty({
    example: 'ETS TOEIC 2026 Test 1',
    description: 'Tiêu đề đề thi',
  })
  examTitle!: string;

  @ApiProperty({
    enum: PartPracticeMode,
    example: PartPracticeMode.FULL_EXAM,
    description: 'Chế độ làm bài (full_exam | part_practice)',
  })
  mode!: PartPracticeMode;

  @ApiProperty({
    type: [Number],
    nullable: true,
    example: null,
    description: 'Danh sách các Part được chọn khi luyện tập theo Part',
  })
  selectedParts!: number[] | null;

  @ApiProperty({
    enum: ExamAttemptStatus,
    example: ExamAttemptStatus.SUBMITTED,
    description: 'Trạng thái lượt thi',
  })
  status!: ExamAttemptStatus;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 785,
    description: 'Tổng điểm TOEIC (10–990) hoặc null',
  })
  totalScore!: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 410,
    description: 'Điểm kỹ năng Nghe (5–495) hoặc null',
  })
  listeningScore!: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 375,
    description: 'Điểm kỹ năng Đọc (5–495) hoặc null',
  })
  readingScore!: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 155,
    description: 'Số câu trả lời đúng (null nếu chưa chấm điểm)',
  })
  correctCount!: number | null;

  @ApiProperty({
    example: 200,
    description: 'Tổng số câu hỏi trong lượt thi',
  })
  totalQuestions!: number;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 77.5,
    description: 'Tỷ lệ chính xác (%) hoặc null nếu chưa chấm điểm',
  })
  accuracyPercentage!: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 6900,
    description: 'Thời gian làm bài thực tế tính bằng giây (null nếu chưa nộp)',
  })
  durationSpentSeconds!: number | null;

  @ApiProperty({
    type: Boolean,
    nullable: true,
    example: true,
    description: 'Kết quả đạt/trượt so với điểm chuẩn hoặc null',
  })
  isPassed!: boolean | null;

  @ApiProperty({
    example: '2026-11-15T08:00:00.000Z',
    description: 'Thời điểm bắt đầu làm bài',
  })
  startedAt!: Date;

  @ApiProperty({
    type: Date,
    nullable: true,
    example: '2026-11-15T09:55:00.000Z',
    description: 'Thời điểm nộp bài (null nếu đang làm hoặc bị hủy)',
  })
  submittedAt!: Date | null;
}

export class PaginatedExamAttemptHistoryResponseDto {
  @ApiProperty({ type: [ExamAttemptHistoryItemDto] })
  items!: ExamAttemptHistoryItemDto[];

  @ApiProperty({ description: 'Tổng số lượt thi thỏa mãn điều kiện lọc', example: 15 })
  total!: number;

  @ApiProperty({ description: 'Trang hiện tại', example: 1 })
  page!: number;

  @ApiProperty({ description: 'Số lượng bản ghi mỗi trang', example: 10 })
  limit!: number;

  @ApiProperty({ description: 'Tổng số trang', example: 2 })
  totalPages!: number;
}
