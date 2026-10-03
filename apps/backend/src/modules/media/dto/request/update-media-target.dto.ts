import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class UpdateMediaTargetDto {
  @ApiPropertyOptional({ example: '10000000-0000-4000-8000-000000000001', nullable: true })
  @IsOptional()
  @IsUUID('4')
  questionId?: string | null;

  @ApiPropertyOptional({ example: '20000000-0000-4000-8000-000000000001', nullable: true })
  @IsOptional()
  @IsUUID('4')
  questionGroupId?: string | null;
}
