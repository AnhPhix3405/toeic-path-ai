import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { ExamAttemptStatus } from '../../enums/exam-attempt-status.enum';
import { PartPracticeMode } from '../../enums/part-practice-mode.enum';

export class QueryAttemptHistoryDto {
  @ApiPropertyOptional({
    example: 1,
    default: 1,
    description: 'Số trang hiện tại (bắt đầu từ 1)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page phải là số nguyên' })
  @Min(1, { message: 'page phải lớn hơn hoặc bằng 1' })
  page?: number = 1;

  @ApiPropertyOptional({
    example: 10,
    default: 10,
    description: 'Số lượng bản ghi mỗi trang (tối đa 50)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit phải là số nguyên' })
  @Min(1, { message: 'limit phải lớn hơn hoặc bằng 1' })
  @Max(50, { message: 'limit không được vượt quá 50' })
  limit?: number = 10;

  @ApiPropertyOptional({
    example: '10000000-0000-4000-8000-000000000001',
    description: 'Lọc theo ID đề thi',
  })
  @IsOptional()
  @IsUUID('4', { message: 'examId phải là định dạng UUID hợp lệ' })
  examId?: string;

  @ApiPropertyOptional({
    enum: PartPracticeMode,
    description: 'Lọc theo chế độ làm bài (full_exam | part_practice)',
  })
  @IsOptional()
  @IsEnum(PartPracticeMode, { message: 'mode không hợp lệ' })
  mode?: PartPracticeMode;

  @ApiPropertyOptional({
    enum: ExamAttemptStatus,
    description: 'Lọc theo trạng thái lượt thi',
  })
  @IsOptional()
  @IsEnum(ExamAttemptStatus, { message: 'status không hợp lệ' })
  status?: ExamAttemptStatus;

  @ApiPropertyOptional({
    example: '2026-11-01',
    description: 'Lọc từ ngày (ISO 8601 date hoặc timestamp)',
  })
  @IsOptional()
  @IsDateString({}, { message: 'fromDate phải là chuỗi ngày ISO 8601 hợp lệ' })
  fromDate?: string;

  @ApiPropertyOptional({
    example: '2026-11-15',
    description: 'Lọc đến ngày (ISO 8601 date hoặc timestamp)',
  })
  @IsOptional()
  @IsDateString({}, { message: 'toDate phải là chuỗi ngày ISO 8601 hợp lệ' })
  toDate?: string;
}
