import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { PartPracticeMode } from '../../enums/part-practice-mode.enum';

export class CreateExamAttemptDto {
  @ApiProperty({
    description: 'ID của đề thi cần tham gia làm bài',
    example: '30000000-0000-4000-8000-000000000001',
  })
  @IsUUID('4')
  @IsNotEmpty()
  examId!: string;

  @ApiPropertyOptional({
    enum: PartPracticeMode,
    default: PartPracticeMode.FULL_EXAM,
    description: 'Chế độ làm bài: full_exam hoặc part_practice',
  })
  @IsOptional()
  @IsEnum(PartPracticeMode)
  mode: PartPracticeMode = PartPracticeMode.FULL_EXAM;

  @ApiPropertyOptional({
    description: 'Danh sách các Part được chọn khi mode = part_practice (VD: [5, 6])',
    example: [5],
    type: [Number],
  })
  @ValidateIf((o: CreateExamAttemptDto) => o.mode === PartPracticeMode.PART_PRACTICE)
  @IsArray()
  @ArrayNotEmpty({ message: 'selectedParts không được rỗng khi chọn chế độ part_practice' })
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  selectedParts?: number[];

  @ApiPropertyOptional({ description: 'Thông tin User-Agent hoặc tên thiết bị học viên' })
  @IsOptional()
  @IsString()
  deviceInfo?: string;
}
