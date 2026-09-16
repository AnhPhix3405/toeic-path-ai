import { ApiProperty } from '@nestjs/swagger';
import { QuestionStatus } from '../enums/question-status.enum';
import { QuestionType } from '../enums/question-type.enum';

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

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;
}
