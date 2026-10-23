import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { ExamStatus } from '../../enums/exam-status.enum';
import { QueryExamsDto } from './query-exams.dto';

export class QueryManageExamsDto extends QueryExamsDto {
  @ApiPropertyOptional({
    description: 'Trạng thái đề thi (quản trị)',
    enum: ExamStatus,
  })
  @IsOptional()
  @IsEnum(ExamStatus)
  status?: ExamStatus;
}
