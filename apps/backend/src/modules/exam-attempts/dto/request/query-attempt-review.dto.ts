import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { AttemptReviewFilter } from '../../enums/attempt-review-filter.enum';

export class QueryAttemptReviewDto {
  @ApiPropertyOptional({
    example: 5,
    description: 'Số thứ tự Part TOEIC cần xem lại (từ 1 đến 7)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'partNumber phải là số nguyên' })
  @Min(1, { message: 'partNumber phải từ 1 đến 7' })
  @Max(7, { message: 'partNumber phải từ 1 đến 7' })
  partNumber?: number;

  @ApiPropertyOptional({
    example: 5,
    description: 'Alias ngắn gọn của partNumber — số thứ tự Part TOEIC cần xem lại (từ 1 đến 7)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'part phải là số nguyên' })
  @Min(1, { message: 'part phải từ 1 đến 7' })
  @Max(7, { message: 'part phải từ 1 đến 7' })
  part?: number;

  @ApiPropertyOptional({
    enum: AttemptReviewFilter,
    default: AttemptReviewFilter.ALL,
    description: 'Bộ lọc trạng thái câu trả lời (all | correct | wrong | skipped | marked)',
  })
  @IsOptional()
  @IsEnum(AttemptReviewFilter, { message: 'filter không hợp lệ' })
  filter?: AttemptReviewFilter = AttemptReviewFilter.ALL;
}
