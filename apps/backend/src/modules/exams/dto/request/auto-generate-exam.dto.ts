import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class PartGenerationCriteriaDto {
  @ApiProperty({
    description: 'Số thứ tự Part TOEIC (1 - 7)',
    example: 5,
    minimum: 1,
    maximum: 7,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(7)
  partNumber!: number;

  @ApiPropertyOptional({
    description:
      'Chỉ tiêu số câu hỏi muốn sinh cho Part này (nếu không cung cấp, lấy theo section)',
    example: 30,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  targetQuestionsCount?: number;

  @ApiPropertyOptional({
    description: 'Tỷ lệ % câu hỏi mức độ DỄ (0 - 100, mặc định: 30)',
    example: 30,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  easyPercentage?: number;

  @ApiPropertyOptional({
    description: 'Tỷ lệ % câu hỏi mức độ TRUNG BÌNH (0 - 100, mặc định: 50)',
    example: 50,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  mediumPercentage?: number;

  @ApiPropertyOptional({
    description: 'Tỷ lệ % câu hỏi mức độ KHÓ (0 - 100, mặc định: 20)',
    example: 20,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  hardPercentage?: number;

  @ApiPropertyOptional({
    description: 'Danh sách ID chủ đề (Topic) ưu tiên chọn câu hỏi',
    example: ['40000000-0000-4000-8000-000000000001'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayUnique()
  topicIds?: string[];
}

export class AutoGenerateExamDto {
  @ApiProperty({
    description: 'Version hiện tại của đề thi (Optimistic Locking)',
    example: 1,
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version!: number;

  @ApiPropertyOptional({
    description:
      'Danh sách tiêu chí sinh đề riêng theo từng Part (nếu không cung cấp, áp dụng mặc định)',
    type: [PartGenerationCriteriaDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PartGenerationCriteriaDto)
  criteria?: PartGenerationCriteriaDto[];
}
