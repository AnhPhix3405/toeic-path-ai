import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class QueryReviewQueueDto {
  @ApiPropertyOptional({ description: 'Filter by TOEIC Part UUID' })
  @IsOptional()
  @IsUUID('4')
  partId?: string;

  @ApiPropertyOptional({ description: 'Filter by Topic UUIDs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  topicIds?: string[];

  @ApiPropertyOptional({ description: 'Filter by Creator User UUID' })
  @IsOptional()
  @IsUUID('4')
  creatorId?: string;

  @ApiPropertyOptional({ description: 'Search keywords in question content or explanation' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
