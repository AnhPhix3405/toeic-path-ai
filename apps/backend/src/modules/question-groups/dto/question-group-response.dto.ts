import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuestionResponseDto } from '../../questions/dto/question-response.dto';

export class QuestionGroupResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiPropertyOptional({ example: 'Questions 151-153', nullable: true })
  title!: string | null;

  @ApiProperty({ example: 'From: john@example.com\nTo: ...' })
  context!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;

  @ApiProperty({ type: () => QuestionResponseDto, isArray: true })
  questions!: QuestionResponseDto[];
}
