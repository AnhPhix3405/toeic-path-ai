import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsInt, IsUUID, Min, ValidateNested } from 'class-validator';

export class BatchApproveItemDto {
  @ApiProperty({ description: 'Question UUID to approve', example: 'd0a7a3b3-1e5b-42c2-841f-13a863c3d5e2' })
  @IsUUID('4')
  questionId!: string;

  @ApiProperty({ description: 'Current optimistic locking version', example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version!: number;
}

export class BatchApproveQuestionsDto {
  @ApiProperty({ description: 'Array of questions to approve in batch', type: [BatchApproveItemDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => BatchApproveItemDto)
  items!: BatchApproveItemDto[];
}
