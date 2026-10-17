import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class QuickFixOptionDto {
  @ApiProperty({
    description: 'Option UUID to update',
    example: 'd0a7a3b3-1e5b-42c2-841f-13a863c3d5e2',
  })
  @IsUUID('4')
  id!: string;

  @ApiPropertyOptional({
    description: 'Option content (nullable for Part 1 & Part 2, required for others)',
    example: 'reviewed',
    nullable: true,
  })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  content?: string | null;

  @ApiProperty({ description: 'Whether this option is the correct answer', example: true })
  @IsBoolean()
  isCorrect!: boolean;
}

export class QuickFixApproveDto {
  @ApiProperty({ description: 'Current optimistic locking version of the question', example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version!: number;

  @ApiPropertyOptional({
    description: 'Updated question content text (nullable for Part 1, 2, 6)',
    example: 'Where is the annual conference being held?',
    nullable: true,
  })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  content?: string | null;

  @ApiPropertyOptional({
    description: 'Updated explanation for the answer',
    example: 'Preposition "at" indicates the specific time.',
  })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  explanation?: string;

  @ApiPropertyOptional({
    description: 'List of options to update during quick-fix',
    type: [QuickFixOptionDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuickFixOptionDto)
  options?: QuickFixOptionDto[];

  @ApiPropertyOptional({
    description: 'Emergency bypass flag for Admin self-approval (audited)',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  emergencyBypass?: boolean;

  @ApiPropertyOptional({
    description: 'Optional review feedback or audit note',
    example: 'Fixed minor typo in option B and approved',
  })
  @IsOptional()
  @IsString()
  feedback?: string;
}
