import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsISO8601,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class BatchAnswerItemDto {
  @ApiProperty({
    description: 'ID của câu hỏi',
    example: '20000000-0000-4000-8000-000000000001',
  })
  @IsNotEmpty({ message: 'questionId không được để trống' })
  @IsUUID('4', { message: 'questionId phải là UUID v4 hợp lệ' })
  questionId!: string;

  @ApiPropertyOptional({
    description: 'ID của phương án chọn, null nếu bỏ chọn, hoặc undefined',
    example: '30000000-0000-4000-8000-000000000001',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_obj, value) => value !== null && value !== undefined)
  @IsUUID('4', { message: 'selectedOptionId phải là UUID v4 hợp lệ hoặc null' })
  selectedOptionId?: string | null;

  @ApiPropertyOptional({
    description: 'Cờ đánh dấu câu hỏi để xem lại sau',
    example: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'isMarkedForReview phải là kiểu boolean' })
  isMarkedForReview?: boolean;

  @ApiPropertyOptional({
    description: 'Số giây học viên thao tác trên câu hỏi (tối đa 7200s)',
    example: 12,
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'timeSpentSeconds phải là số nguyên' })
  @Min(0, { message: 'timeSpentSeconds không được âm' })
  @Max(7200, { message: 'timeSpentSeconds không được vượt quá 7200 giây' })
  timeSpentSeconds?: number = 0;

  @ApiPropertyOptional({
    description: 'Thời điểm học viên chọn câu trả lời ở client (ISO 8601) khi offline',
    example: '2026-11-01T08:12:00.000Z',
  })
  @IsOptional()
  @IsISO8601({}, { message: 'clientAnsweredAt phải là định dạng ISO 8601 hợp lệ' })
  clientAnsweredAt?: string;
}

export class BatchSaveAnswersDto {
  @ApiProperty({
    description: 'Danh sách các câu trả lời cần đồng bộ sau khi phục hồi mạng (1..200 câu)',
    type: [BatchAnswerItemDto],
  })
  @IsArray({ message: 'answers phải là một mảng' })
  @ArrayMinSize(1, { message: 'answers phải có ít nhất 1 phần tử' })
  @ArrayMaxSize(200, { message: 'answers không được vượt quá 200 phần tử trong 1 lô' })
  @ValidateNested({ each: true })
  @Type(() => BatchAnswerItemDto)
  answers!: BatchAnswerItemDto[];
}
