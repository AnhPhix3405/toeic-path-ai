import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayUnique, IsArray, IsInt, IsNotEmpty, IsOptional, IsUUID, Min } from 'class-validator';

export class AddExamQuestionsDto {
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
    description: 'ID của phần thi (ExamSection) cần thêm câu hỏi vào',
    example: '10000000-0000-4000-8000-000000000001',
  })
  @IsUUID('4')
  @IsNotEmpty()
  sectionId!: string;

  @ApiPropertyOptional({
    description: 'Danh sách ID câu hỏi đơn lẻ (bắt buộc questionGroupId = null)',
    example: ['20000000-0000-4000-8000-000000000001'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayUnique()
  questionIds?: string[];

  @ApiPropertyOptional({
    description: 'Danh sách ID nhóm câu hỏi (QuestionGroup) cần nạp nguyên khối',
    example: ['30000000-0000-4000-8000-000000000001'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayUnique()
  questionGroupIds?: string[];
}
