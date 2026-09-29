import { ApiProperty } from '@nestjs/swagger';
import { QuestionStatus } from '../../enums/question-status.enum';
import { QuestionType } from '../../enums/question-type.enum';
import { QuestionOptionResponseDto } from './question-option-response.dto';
import { QuestionDifficulty } from '../../enums/question-difficulty.enum';
import { TaxonomyItemResponseDto, ToeicPartResponseDto } from './classification-response.dto';

export class QuestionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Where is the meeting being held?' })
  content!: string;

  @ApiProperty({ enum: QuestionType })
  questionType!: QuestionType;

  @ApiProperty({ enum: QuestionStatus })
  status!: QuestionStatus;

  @ApiProperty({ example: 1, nullable: true })
  groupOrder!: number | null;

  @ApiProperty({ nullable: true, example: 'Yesterday indicates the simple past tense.' })
  explanation!: string | null;

  @ApiProperty({ type: () => QuestionOptionResponseDto, isArray: true })
  options!: QuestionOptionResponseDto[];

  @ApiProperty({ type: () => ToeicPartResponseDto, nullable: true })
  part!: ToeicPartResponseDto | null;

  @ApiProperty({ enum: QuestionDifficulty, nullable: true })
  difficulty!: QuestionDifficulty | null;

  @ApiProperty({ type: () => TaxonomyItemResponseDto, isArray: true })
  topics!: TaxonomyItemResponseDto[];

  @ApiProperty({ type: () => TaxonomyItemResponseDto, isArray: true })
  skills!: TaxonomyItemResponseDto[];

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;
}
