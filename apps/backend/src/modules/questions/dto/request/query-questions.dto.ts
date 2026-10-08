import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayUnique,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { QuestionDifficulty } from '../../enums/question-difficulty.enum';
import { QuestionStatus } from '../../enums/question-status.enum';
import { QuestionType } from '../../enums/question-type.enum';

function TransformStringArray({ value }: { value: unknown }): string[] | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (Array.isArray(value)) {
    const items = value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter((s) => s.length > 0);
    return items.length > 0 ? items : undefined;
  }
  if (typeof value === 'string') {
    const items = value
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    return items.length > 0 ? items : undefined;
  }
  return undefined;
}

export class QueryQuestionsDto {
  @ApiPropertyOptional({ description: 'Full-text search in question content' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  partId?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Filter by topics (comma-separated string or array). Uses OR logic.',
  })
  @Transform(TransformStringArray)
  @IsOptional()
  @IsUUID(4, { each: true })
  @ArrayUnique()
  topicIds?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Filter by skills (comma-separated string or array). Uses OR logic.',
  })
  @Transform(TransformStringArray)
  @IsOptional()
  @IsUUID(4, { each: true })
  @ArrayUnique()
  skillIds?: string[];

  @ApiPropertyOptional({ enum: QuestionDifficulty })
  @IsOptional()
  @IsEnum(QuestionDifficulty)
  difficulty?: QuestionDifficulty;

  @ApiPropertyOptional({ enum: QuestionStatus })
  @IsOptional()
  @IsEnum(QuestionStatus)
  status?: QuestionStatus;

  @ApiPropertyOptional({ enum: QuestionType })
  @IsOptional()
  @IsEnum(QuestionType)
  questionType?: QuestionType;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 50 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 20;
}
