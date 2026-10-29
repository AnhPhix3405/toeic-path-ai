import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class QueryAttemptQuestionsDto {
  @ApiPropertyOptional({ description: 'Lọc câu hỏi theo số thứ tự Part (1 đến 7)', example: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(7)
  partNumber?: number;
}
