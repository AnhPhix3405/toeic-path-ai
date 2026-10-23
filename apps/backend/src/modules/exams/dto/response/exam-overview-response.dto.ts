import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExamType } from '../../enums/exam-type.enum';

export class ExamPartOverviewDto {
  @ApiProperty({ example: 1 })
  partNumber!: number;

  @ApiProperty({ example: 'Part 1: Photographs' })
  partName!: string;

  @ApiProperty({ example: 6 })
  questionCount!: number;

  @ApiPropertyOptional({ example: 10, nullable: true })
  suggestedDuration!: number | null;
}

export class ExamOverviewResponseDto {
  @ApiProperty({ example: 'a0a7b45f-14f7-4148-8eb1-14f717880000' })
  id!: string;

  @ApiProperty({ example: 'ETS TOEIC 2026 Test 01' })
  title!: string;

  @ApiPropertyOptional({ example: 'Đề thi thử TOEIC chuẩn format 2026', nullable: true })
  description!: string | null;

  @ApiProperty({ enum: ExamType, example: ExamType.FULL_TEST })
  type!: ExamType;

  @ApiProperty({ example: 120 })
  durationMinutes!: number;

  @ApiProperty({ example: 200 })
  totalQuestions!: number;

  @ApiProperty({ example: true })
  allowPartPractice!: boolean;

  @ApiProperty({ type: [ExamPartOverviewDto] })
  parts!: ExamPartOverviewDto[];

  @ApiPropertyOptional({ example: '2026-10-01T00:00:00.000Z', nullable: true })
  openAt!: Date | null;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.000Z', nullable: true })
  closeAt!: Date | null;

  @ApiProperty({
    example: false,
    description: 'true nếu đề thi đã lên lịch nhưng chưa tới giờ mở (openAt > now)',
  })
  isScheduled!: boolean;

  @ApiPropertyOptional({
    example: 3,
    nullable: true,
    description:
      'Số lượt thi còn lại của người dùng. null đối với khách vãng lai hoặc đề thi không giới hạn lượt thi.',
  })
  remainingAttempts!: number | null;
}
