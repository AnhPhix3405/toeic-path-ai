import { Type } from 'class-transformer';
import { IsInt, IsUUID, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignQuestionGroupDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  questionGroupId!: string;

  @ApiProperty({ example: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  groupOrder!: number;
}
