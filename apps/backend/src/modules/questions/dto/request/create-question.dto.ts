import { Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuestionType } from '../../enums/question-type.enum';

export class CreateQuestionDto {
  @ApiPropertyOptional({ example: 'Where is the meeting being held?', nullable: true })
  @Transform(({ obj }: { obj?: Record<string, unknown> }) => {
    const raw = obj?.content;
    return typeof raw === 'string' ? raw.trim() : raw;
  })
  @IsOptional()
  @IsString()
  content?: string | null;

  @ApiProperty({ enum: QuestionType, example: QuestionType.SINGLE_CHOICE })
  @IsEnum(QuestionType)
  questionType!: QuestionType;

  @ApiPropertyOptional({ example: 'Yesterday indicates the simple past tense.' })
  @Transform(({ obj }: { obj?: Record<string, unknown> }) => {
    const raw = obj?.explanation;
    return typeof raw === 'string' ? raw.trim() : raw;
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  explanation?: string;
}
