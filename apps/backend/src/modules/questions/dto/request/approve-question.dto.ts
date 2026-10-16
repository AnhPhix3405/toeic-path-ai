import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class ApproveQuestionDto {
  @ApiProperty({ description: 'Current optimistic locking version of the question', example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version!: number;

  @ApiPropertyOptional({
    description: 'Emergency bypass flag for Admin self-approval (audited)',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  emergencyBypass?: boolean;

  @ApiPropertyOptional({
    description: 'Optional review feedback or note',
    example: 'Question approved after review',
  })
  @IsOptional()
  @IsString()
  feedback?: string;
}
