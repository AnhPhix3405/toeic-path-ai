import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { QuestionReportReason } from '../../enums/question-report-reason.enum';
import { QueryMyQuestionReportsDto } from './query-my-question-reports.dto';

export class QueryQuestionReportsDto extends QueryMyQuestionReportsDto {
  @ApiPropertyOptional({
    enum: QuestionReportReason,
    description: 'Lọc theo lý do báo cáo',
  })
  @IsOptional()
  @IsEnum(QuestionReportReason, { message: 'reason không hợp lệ' })
  reason?: QuestionReportReason;

  @ApiPropertyOptional({
    example: '20000000-0000-4000-8000-000000000001',
    description: 'Lọc theo ID câu hỏi bị báo cáo',
  })
  @IsOptional()
  @IsUUID('4', { message: 'questionId phải là định dạng UUID hợp lệ' })
  questionId?: string;
}
