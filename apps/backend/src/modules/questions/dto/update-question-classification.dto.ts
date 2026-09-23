import { ApiProperty } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsEnum, IsUUID } from 'class-validator';
import { QuestionDifficulty } from '../enums/question-difficulty.enum';

export class UpdateQuestionClassificationDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  partId!: string;

  @ApiProperty({ type: String, isArray: true, format: 'uuid' })
  @IsArray()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  topicIds!: string[];

  @ApiProperty({ type: String, isArray: true, format: 'uuid' })
  @IsArray()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  skillIds!: string[];

  @ApiProperty({ enum: QuestionDifficulty, example: QuestionDifficulty.MEDIUM })
  @IsEnum(QuestionDifficulty)
  difficulty!: QuestionDifficulty;
}
