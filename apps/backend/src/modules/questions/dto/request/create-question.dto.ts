import { Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuestionType } from '../../enums/question-type.enum';

export class CreateQuestionDto {
  @ApiPropertyOptional({ example: 'Where is the meeting being held?', nullable: true })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  content?: string | null;

  @ApiProperty({ enum: QuestionType, example: QuestionType.SINGLE_CHOICE })
  @IsEnum(QuestionType)
  questionType!: QuestionType;

  @ApiPropertyOptional({ example: 'Yesterday indicates the simple past tense.' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  explanation?: string;
}
