import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExamType } from '../../enums/exam-type.enum';

export class ExamCatalogItemResponseDto {
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

  @ApiProperty({ example: 0, description: 'Tổng số lượt học viên đã thi' })
  totalAttempts!: number;

  @ApiPropertyOptional({ example: '2026-10-01T00:00:00.000Z', nullable: true })
  openAt!: Date | null;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.000Z', nullable: true })
  closeAt!: Date | null;

  @ApiProperty({
    example: false,
    description: 'true nếu đề thi đã được công bố nhưng chưa đến giờ mở (openAt > now)',
  })
  isScheduled!: boolean;
}
