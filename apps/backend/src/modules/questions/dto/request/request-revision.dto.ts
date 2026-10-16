import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class RequestRevisionDto {
  @ApiProperty({ description: 'Current optimistic locking version of the question', example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version!: number;

  @ApiProperty({
    description: 'Mandatory revision instructions or feedback for the creator',
    example: 'Please check grammar in Option B and provide more explanation.',
  })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'Feedback is mandatory when requesting revision' })
  feedback!: string;

  @ApiPropertyOptional({
    description: 'Whether to apply revision request to all questions in the same group',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  applyToWholeGroup?: boolean;
}
