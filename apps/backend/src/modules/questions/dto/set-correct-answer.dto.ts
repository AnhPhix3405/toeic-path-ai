import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetCorrectAnswerDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  optionId!: string;
}
