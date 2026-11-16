import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { QuestionReportStatus } from '../../enums/question-report-status.enum';

export class QueryMyQuestionReportsDto {
  @ApiPropertyOptional({
    example: 1,
    default: 1,
    description: 'Trang hiện tại (bắt đầu từ 1)',
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
    enum: QuestionReportStatus,
    description: 'Lọc theo trạng thái xử lý báo cáo',
  })
  @IsOptional()
  @IsEnum(QuestionReportStatus, { message: 'status không hợp lệ' })
  status?: QuestionReportStatus;
}
