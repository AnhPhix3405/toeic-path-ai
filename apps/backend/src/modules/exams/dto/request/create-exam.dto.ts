import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ExamType } from '../../enums/exam-type.enum';
import { ScoreConversionType } from '../../enums/score-conversion-type.enum';

export class CreateExamDto {
  @ApiProperty({
    description: 'Tiêu đề đề thi (5 - 255 ký tự)',
    example: 'ETS TOEIC 2026 Test 01',
    minLength: 5,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional({
    description: 'Mô tả chi tiết cấu trúc hoặc đối tượng hướng tới của đề thi',
    example: 'Đề thi thử TOEIC chuẩn format 2026 với 200 câu hỏi trong 120 phút.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Loại hình đề thi: full_test, mini_test, placement_test',
    enum: ExamType,
    example: ExamType.FULL_TEST,
  })
  @IsEnum(ExamType)
  @IsNotEmpty()
  type!: ExamType;

  @ApiProperty({
    description: 'Thời lượng làm bài quy định (phút, từ 1 đến 300)',
    example: 120,
    minimum: 1,
    maximum: 300,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(300)
  durationMinutes!: number;

  @ApiPropertyOptional({
    description: 'Số lần tối đa học viên được làm bài (null/undefined = không giới hạn, >= 1)',
    example: 3,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxAttempts?: number;

  @ApiPropertyOptional({
    description: 'Điểm sàn đạt yêu cầu (0 - 990 điểm)',
    example: 600,
    minimum: 0,
    maximum: 990,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(990)
  passingScore?: number;

  @ApiPropertyOptional({
    description: 'Thời điểm bắt đầu mở đề cho học viên (ISO-8601)',
    example: '2026-10-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsISO8601()
  openAt?: string;

  @ApiPropertyOptional({
    description: 'Thời điểm kết thúc đóng đề thi (ISO-8601)',
    example: '2026-12-31T23:59:59.000Z',
  })
  @IsOptional()
  @IsISO8601()
  closeAt?: string;

  @ApiPropertyOptional({
    description: 'Cho phép thí sinh luyện tập từng phần riêng lẻ (mặc định: true)',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  allowPartPractice?: boolean;

  @ApiPropertyOptional({
    description: 'Xáo trộn thứ tự câu hỏi khi thi (mặc định: false)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isShuffledQuestions?: boolean;

  @ApiPropertyOptional({
    description: 'Xáo trộn thứ tự các phương án lựa chọn A, B, C, D (mặc định: false)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isShuffledOptions?: boolean;

  @ApiPropertyOptional({
    description: 'Phương thức quy đổi điểm: DEFAULT_ETS, CUSTOM, RAW_PERCENTAGE',
    enum: ScoreConversionType,
    default: ScoreConversionType.DEFAULT_ETS,
  })
  @IsOptional()
  @IsEnum(ScoreConversionType)
  scoreConversionType?: ScoreConversionType;
}
