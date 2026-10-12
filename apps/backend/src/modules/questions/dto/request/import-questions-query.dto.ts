import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { QuestionStatus } from '../../enums/question-status.enum';

export class ImportQuestionsQueryDto {
  @ApiPropertyOptional({
    description: 'Trạng thái đích cho câu hỏi import (draft hoặc pending_review)',
    enum: QuestionStatus,
    default: QuestionStatus.DRAFT,
  })
  @IsOptional()
  @IsEnum(QuestionStatus)
  targetStatus?: QuestionStatus = QuestionStatus.DRAFT;
}
