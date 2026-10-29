import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

export class SaveAnswerDto {
  @ApiProperty({
    description: 'ID của câu hỏi cần lưu câu trả lời hoặc cờ review',
    example: '20000000-0000-4000-8000-000000000001',
  })
  @IsNotEmpty({ message: 'questionId không được để trống' })
  @IsUUID('4', { message: 'questionId phải là UUID v4 hợp lệ' })
  questionId!: string;

  @ApiPropertyOptional({
    description:
      'ID của phương án được chọn. Truyền UUID nếu chọn mới, truyền null nếu bỏ chọn (uncheck), không truyền (undefined) nếu chỉ toggle cờ review',
    example: '30000000-0000-4000-8000-000000000001',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_obj, value) => value !== null && value !== undefined)
  @IsUUID('4', { message: 'selectedOptionId phải là UUID v4 hợp lệ hoặc null' })
  selectedOptionId?: string | null;

  @ApiPropertyOptional({
    description: 'Cờ đánh dấu câu hỏi để xem lại sau',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'isMarkedForReview phải là kiểu boolean' })
  isMarkedForReview?: boolean;

  @ApiPropertyOptional({
    description: 'Số giây học viên thao tác trên câu hỏi (tối đa 7200s)',
    example: 15,
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'timeSpentSeconds phải là số nguyên' })
  @Min(0, { message: 'timeSpentSeconds không được âm' })
  @Max(7200, { message: 'timeSpentSeconds không được vượt quá 7200 giây (2 giờ)' })
  timeSpentSeconds?: number = 0;
}
