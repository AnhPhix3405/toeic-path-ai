import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class ReorderItemDto {
  @ApiProperty({
    description: 'ID của câu hỏi (Question ID)',
    example: '20000000-0000-4000-8000-000000000001',
  })
  @IsUUID('4')
  @IsNotEmpty()
  questionId!: string;

  @ApiProperty({
    description: 'Thứ tự hiển thị mới trong toàn đề thi (bắt đầu từ 1)',
    example: 1,
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  orderIndex!: number;
}

export class ReorderExamQuestionsDto {
  @ApiProperty({
    description: 'Version hiện tại của đề thi (Optimistic Locking)',
    example: 1,
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version!: number;

  @ApiProperty({
    description: 'Danh sách vị trí thứ tự mới của toàn bộ câu hỏi trong đề thi',
    type: [ReorderItemDto],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ReorderItemDto)
  items!: ReorderItemDto[];
}
