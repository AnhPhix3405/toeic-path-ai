import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateBy,
  ValidateIf,
} from 'class-validator';
import { QuestionReportStatus } from '../../enums/question-report-status.enum';

export class ResolveQuestionReportDto {
  @ApiProperty({
    enum: [
      QuestionReportStatus.IN_REVIEW,
      QuestionReportStatus.RESOLVED,
      QuestionReportStatus.REJECTED,
    ],
    example: QuestionReportStatus.RESOLVED,
    description: 'Trạng thái cập nhật xử lý báo cáo (in_review | resolved | rejected)',
  })
  @IsIn(
    [QuestionReportStatus.IN_REVIEW, QuestionReportStatus.RESOLVED, QuestionReportStatus.REJECTED],
    {
      message: 'status chỉ chấp nhận các giá trị: in_review, resolved, rejected',
    },
  )
  status!: QuestionReportStatus;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'Đã kiểm tra và cập nhật lại đáp án đúng cho câu hỏi.',
    description:
      'Ghi chú phản hồi xử lý (bắt buộc 10–1000 ký tự khi status là resolved hoặc rejected)',
  })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @ValidateIf(
    (o: ResolveQuestionReportDto) =>
      o.status === QuestionReportStatus.RESOLVED ||
      o.status === QuestionReportStatus.REJECTED ||
      (o.resolutionNote !== undefined && o.resolutionNote !== null && o.resolutionNote !== ''),
  )
  @IsString({ message: 'resolutionNote phải là chuỗi ký tự' })
  @MaxLength(1000, { message: 'resolutionNote không được vượt quá 1000 ký tự' })
  @ValidateBy({
    name: 'resolutionNoteRequiredForFinalStatus',
    validator: {
      validate(value: unknown, args) {
        const obj = args?.object as ResolveQuestionReportDto | undefined;
        if (
          obj?.status !== QuestionReportStatus.RESOLVED &&
          obj?.status !== QuestionReportStatus.REJECTED
        ) {
          return true;
        }
        return typeof value === 'string' && value.length >= 10;
      },
      defaultMessage: () =>
        'resolutionNote là bắt buộc và phải có ít nhất 10 ký tự khi chuyển sang trạng thái resolved hoặc rejected',
    },
  })
  resolutionNote?: string;

  @ApiPropertyOptional({
    example: false,
    default: false,
    description:
      'Tùy chọn đóng đồng loạt tất cả báo cáo đang mở (pending/in_review) của cùng câu hỏi này',
  })
  @IsOptional()
  @IsBoolean({ message: 'resolveAllForQuestion phải là kiểu boolean' })
  resolveAllForQuestion?: boolean = false;
}
