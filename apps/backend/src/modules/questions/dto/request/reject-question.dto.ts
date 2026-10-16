import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class RejectQuestionDto {
  @ApiProperty({ description: 'Current optimistic locking version of the question', example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version!: number;

  @ApiProperty({
    description: 'Mandatory rejection reason or feedback for the creator',
    example: 'Question violates copyright or contains inaccurate information.',
  })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'Feedback is mandatory when rejecting a question' })
  feedback!: string;

  @ApiPropertyOptional({
    description: 'Whether to apply rejection to all questions in the same group',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  applyToWholeGroup?: boolean;
}
