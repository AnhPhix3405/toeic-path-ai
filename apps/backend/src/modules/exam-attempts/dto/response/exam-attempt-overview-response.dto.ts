import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExamAttemptStatus } from '../../enums/exam-attempt-status.enum';
import { PartPracticeMode } from '../../enums/part-practice-mode.enum';

export class AttemptQuestionStatusDto {
  @ApiProperty({ example: '20000000-0000-4000-8000-000000000001' })
  questionId!: string;

  @ApiProperty({ example: 5 })
  partNumber!: number;

  @ApiProperty({ example: 101 })
  orderIndex!: number;

  @ApiProperty({ example: true })
  isAnswered!: boolean;

  @ApiProperty({ example: false })
  isMarkedForReview!: boolean;
}

export class ExamAttemptOverviewResponseDto {
  @ApiProperty({ example: '50000000-0000-4000-8000-000000000001' })
  id!: string;

  @ApiProperty({ example: '30000000-0000-4000-8000-000000000001' })
  examId!: string;

  @ApiProperty({ example: 'ETS TOEIC 2026 Test 01' })
  examTitle!: string;

  @ApiProperty({ enum: ExamAttemptStatus, example: ExamAttemptStatus.IN_PROGRESS })
  status!: ExamAttemptStatus;

  @ApiProperty({ enum: PartPracticeMode, example: PartPracticeMode.FULL_EXAM })
  mode!: PartPracticeMode;

  @ApiPropertyOptional({ example: [5, 6], nullable: true })
  selectedParts?: number[] | null;

  @ApiProperty({ example: '2026-11-01T08:00:00.000Z' })
  startedAt!: Date;

  @ApiProperty({ example: '2026-11-01T10:00:00.000Z' })
  expiresAt!: Date;

  @ApiProperty({ example: 7150, description: 'Số giây còn lại chính xác tính từ server' })
  remainingSeconds!: number;

  @ApiProperty({
    example: '2026-11-01T08:00:50.000Z',
    description: 'Thời gian hiện tại của server để sync',
  })
  serverTimeNow!: Date;

  @ApiProperty({
    example: false,
    description:
      'True nếu thời gian làm bài đã vượt quá hạn giờ cộng 30 giây thời gian ân hạn mạng (PMR 018)',
  })
  isExpired!: boolean;

  @ApiProperty({ example: 200 })
  totalQuestions!: number;

  @ApiProperty({ example: 45 })
  answeredCount!: number;

  @ApiProperty({ example: 5 })
  markedForReviewCount!: number;

  @ApiProperty({ type: [AttemptQuestionStatusDto] })
  questionsProgress!: AttemptQuestionStatusDto[];
}
