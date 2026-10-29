import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExamAttemptStatus } from '../../enums/exam-attempt-status.enum';
import { PartPracticeMode } from '../../enums/part-practice-mode.enum';

export class ExamAttemptSummaryResponseDto {
  @ApiProperty({ example: '50000000-0000-4000-8000-000000000001' })
  attemptId!: string;

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

  @ApiProperty({ example: 200 })
  totalQuestions!: number;

  @ApiProperty({ example: '2026-11-01T08:00:00.000Z' })
  startedAt!: Date;

  @ApiProperty({ example: '2026-11-01T10:00:00.000Z' })
  expiresAt!: Date;

  @ApiProperty({ example: 7200, description: 'Số giây còn lại tính từ server' })
  remainingSeconds!: number;

  @ApiProperty({ example: '2026-11-01T08:00:00.000Z' })
  serverTimeNow!: Date;

  @ApiPropertyOptional({
    example: false,
    description: 'True nếu đây là phiên thi cũ được khôi phục (A1) thay vì tạo mới',
  })
  isResumed?: boolean = false;
}
