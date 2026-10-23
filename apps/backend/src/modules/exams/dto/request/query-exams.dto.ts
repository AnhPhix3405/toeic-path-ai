import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ExamType } from '../../enums/exam-type.enum';

export class QueryExamsDto {
  @ApiPropertyOptional({ description: 'Số trang (bắt đầu từ 1)', example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({
    description: 'Số lượng đề thi mỗi trang (tối đa 50 theo Tech Debt 003)',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 10;

  @ApiPropertyOptional({
    description: 'Từ khóa tìm kiếm tiêu đề đề thi',
    example: 'ETS TOEIC 2026',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ description: 'Loại đề thi', enum: ExamType })
  @IsOptional()
  @IsEnum(ExamType)
  type?: ExamType;
}
