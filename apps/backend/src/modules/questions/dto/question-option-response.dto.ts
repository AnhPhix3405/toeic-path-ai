import { ApiProperty } from '@nestjs/swagger';

export class QuestionOptionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'B' })
  label!: string;

  @ApiProperty({ example: 'reviewed' })
  content!: string;

  @ApiProperty({ example: true })
  isCorrect!: boolean;

  @ApiProperty({ example: 2 })
  position!: number;
}
