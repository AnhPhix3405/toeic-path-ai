import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExamType } from '../../enums/exam-type.enum';
import { ExamStatus } from '../../enums/exam-status.enum';
import { ScoreConversionType } from '../../enums/score-conversion-type.enum';

export class ExamSectionResponseDto {
  @ApiProperty({ example: 'b0a7b45f-14f7-4148-8eb1-14f717880001' })
  id!: string;

  @ApiProperty({ example: 'b0a7b45f-14f7-4148-8eb1-14f717880000' })
  examId!: string;

  @ApiProperty({ example: 'b0a7b45f-14f7-4148-8eb1-14f717880002' })
  partId!: string;

  @ApiPropertyOptional({ example: 1 })
  partNumber?: number;

  @ApiPropertyOptional({ example: 'Part 1: Photographs' })
  partName?: string;

  @ApiProperty({ example: 6 })
  targetQuestionsCount!: number;

  @ApiPropertyOptional({ example: null, nullable: true })
  targetDurationMinutes!: number | null;

  @ApiPropertyOptional({ example: 0 })
  actualQuestionsCount?: number;
}

export class ExamDetailResponseDto {
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

  @ApiPropertyOptional({ example: 3, nullable: true })
  maxAttempts!: number | null;

  @ApiPropertyOptional({ example: 600, nullable: true })
  passingScore!: number | null;

  @ApiPropertyOptional({ example: '2026-10-01T00:00:00.000Z', nullable: true })
  openAt!: Date | null;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.000Z', nullable: true })
  closeAt!: Date | null;

  @ApiProperty({ example: true })
  allowPartPractice!: boolean;

  @ApiProperty({ example: false })
  isShuffledQuestions!: boolean;

  @ApiProperty({ example: false })
  isShuffledOptions!: boolean;

  @ApiProperty({ enum: ScoreConversionType, example: ScoreConversionType.DEFAULT_ETS })
  scoreConversionType!: ScoreConversionType;

  @ApiProperty({ enum: ExamStatus, example: ExamStatus.DRAFT })
  status!: ExamStatus;

  @ApiPropertyOptional({ example: null, nullable: true })
  publishedAt!: Date | null;

  @ApiProperty({ example: 1 })
  version!: number;

  @ApiProperty({ example: 'c0a7b45f-14f7-4148-8eb1-14f717880003' })
  createdBy!: string;

  @ApiProperty({ example: false })
  isDeleted!: boolean;

  @ApiProperty({ example: 7 })
  sectionsCount!: number;

  @ApiPropertyOptional({ type: [ExamSectionResponseDto] })
  sections?: ExamSectionResponseDto[];

  @ApiProperty({ example: '2026-10-20T04:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-10-20T04:00:00.000Z' })
  updatedAt!: Date;
}
