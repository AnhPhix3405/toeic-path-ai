import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateBy,
  ValidateIf,
} from 'class-validator';
import { QuestionReportReason } from '../../enums/question-report-reason.enum';

export class CreateQuestionReportDto {
  @ApiProperty({
    enum: QuestionReportReason,
    example: QuestionReportReason.WRONG_ANSWER,
    description: 'Lý do báo cáo lỗi câu hỏi',
  })
  @IsEnum(QuestionReportReason, { message: 'reason không hợp lệ' })
  reason!: QuestionReportReason;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'Đáp án đúng phải là phương án B vì chủ ngữ số ít.',
    description:
      'Mô tả chi tiết lỗi (bắt buộc 10–1000 ký tự khi reason = other; tùy chọn tối đa 1000 ký tự cho các lý do khác)',
  })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @ValidateIf(
    (o: CreateQuestionReportDto) =>
      o.reason === QuestionReportReason.OTHER ||
      (o.description !== undefined && o.description !== null && o.description !== ''),
  )
  @IsString({ message: 'description phải là chuỗi ký tự' })
  @MaxLength(1000, { message: 'description không được vượt quá 1000 ký tự' })
  @ValidateBy({
    name: 'descriptionRequiredForOther',
    validator: {
      validate(value: unknown, args) {
        const obj = args?.object as CreateQuestionReportDto | undefined;
        if (obj?.reason !== QuestionReportReason.OTHER) return true;
        return typeof value === 'string' && value.length >= 10;
      },
      defaultMessage: () => 'description phải có ít nhất 10 ký tự khi chọn lý do khác (other)',
    },
  })
  description?: string;

  @ApiPropertyOptional({
    example: '50000000-0000-4000-8000-000000000001',
    description: 'ID lượt làm bài thi phát sinh báo cáo (tùy chọn)',
  })
  @IsOptional()
  @IsUUID('4', { message: 'attemptId phải là định dạng UUID hợp lệ' })
  attemptId?: string;
}
