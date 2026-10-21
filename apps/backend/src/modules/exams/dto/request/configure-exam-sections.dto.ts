import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class SectionItemDto {
  @ApiProperty({
    description: 'Số thứ tự Part TOEIC (1 - 7)',
    example: 1,
    minimum: 1,
    maximum: 7,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(7)
  partNumber!: number;

  @ApiProperty({
    description: 'Chỉ tiêu số câu hỏi cho Part này',
    example: 6,
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  targetQuestionsCount!: number;

  @ApiPropertyOptional({
    description: 'Thời lượng gợi ý làm bài cho Part này (phút)',
    example: 10,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  targetDurationMinutes?: number;
}

export class ConfigureExamSectionsDto {
  @ApiProperty({
    description: 'Version hiện tại của đề thi (Optimistic Locking)',
    example: 1,
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version!: number;

  @ApiProperty({
    description: 'Danh sách các sections và chỉ tiêu câu hỏi tương ứng',
    type: [SectionItemDto],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => SectionItemDto)
  sections!: SectionItemDto[];
}
