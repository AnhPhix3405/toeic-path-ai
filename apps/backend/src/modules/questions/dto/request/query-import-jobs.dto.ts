import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { ImportJobStatus } from '../../enums/import-job-status.enum';

export class QueryImportJobsDto {
  @ApiPropertyOptional({ description: 'Trang hiện tại (1-based)', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Số lượng bản ghi mỗi trang', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Lọc theo trạng thái job',
    enum: ImportJobStatus,
  })
  @IsOptional()
  @IsEnum(ImportJobStatus)
  status?: ImportJobStatus;

  @ApiPropertyOptional({ description: 'Thời gian bắt đầu tạo job (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Thời gian kết thúc tạo job (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  to?: string;
}
