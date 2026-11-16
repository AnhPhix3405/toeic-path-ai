import { ApiProperty } from '@nestjs/swagger';
import { QuestionReportReason } from '../../enums/question-report-reason.enum';
import { QuestionReportStatus } from '../../enums/question-report-status.enum';

export class MyQuestionReportItemDto {
  @ApiProperty({ example: '70000000-0000-4000-8000-000000000001' })
  id!: string;

  @ApiProperty({ example: '20000000-0000-4000-8000-000000000001' })
  questionId!: string;

  @ApiProperty({
    type: String,
    nullable: true,
    example: '50000000-0000-4000-8000-000000000001',
    description: 'ID lượt thi phát sinh báo cáo (null nếu báo cáo ngoài lượt thi)',
  })
  attemptId!: string | null;

  @ApiProperty({ enum: QuestionReportReason, example: QuestionReportReason.WRONG_ANSWER })
  reason!: QuestionReportReason;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'Đáp án đúng phải là B.',
    description: 'Mô tả chi tiết của học viên',
  })
  description!: string | null;

  @ApiProperty({ enum: QuestionReportStatus, example: QuestionReportStatus.PENDING })
  status!: QuestionReportStatus;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'Đã kiểm tra và cập nhật lại đáp án chính xác.',
    description: 'Ghi chú phản hồi từ giáo viên (null nếu chưa xử lý xong)',
  })
  resolutionNote!: string | null;

  @ApiProperty({ example: '2026-11-16T08:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({
    type: Date,
    nullable: true,
    example: null,
    description: 'Thời điểm hoàn tất xử lý (resolved/rejected)',
  })
  resolvedAt!: Date | null;
}

export class PaginatedMyQuestionReportsResponseDto {
  @ApiProperty({ type: [MyQuestionReportItemDto] })
  items!: MyQuestionReportItemDto[];

  @ApiProperty({ example: 5 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 10 })
  limit!: number;

  @ApiProperty({ example: 1 })
  totalPages!: number;
}

export class AdminQuestionReportItemDto extends MyQuestionReportItemDto {
  @ApiProperty({
    example: '30000000-0000-4000-8000-000000000001',
    description: 'ID người gửi báo cáo',
  })
  reporterId!: string;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'student@example.com',
    description: 'Email người gửi báo cáo',
  })
  reporterEmail!: string | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 5,
    description: 'Số thứ tự Part TOEIC của câu hỏi (1..7)',
  })
  partNumber!: number | null;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'The package was ------- to the wrong address yesterday.',
    description: 'Nội dung câu hỏi (null đối với Part 1, 2, 6 theo Rule #1002)',
  })
  questionContent!: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    example: '40000000-0000-4000-8000-000000000001',
    description: 'ID Giáo viên/Admin xử lý báo cáo',
  })
  resolvedById!: string | null;

  @ApiProperty({ example: '2026-11-16T08:30:00.000Z' })
  updatedAt!: Date;
}

export class PaginatedAdminQuestionReportsResponseDto {
  @ApiProperty({ type: [AdminQuestionReportItemDto] })
  items!: AdminQuestionReportItemDto[];

  @ApiProperty({ example: 25 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 2 })
  totalPages!: number;
}

export class ResolveQuestionReportResponseDto {
  @ApiProperty({ example: '70000000-0000-4000-8000-000000000001' })
  id!: string;

  @ApiProperty({ example: '20000000-0000-4000-8000-000000000001' })
  questionId!: string;

  @ApiProperty({ enum: QuestionReportStatus, example: QuestionReportStatus.RESOLVED })
  status!: QuestionReportStatus;

  @ApiProperty({
    type: String,
    nullable: true,
    example: '40000000-0000-4000-8000-000000000001',
    description: 'ID người xử lý (null khi ở trạng thái trung gian in_review)',
  })
  resolvedById!: string | null;

  @ApiProperty({
    type: Date,
    nullable: true,
    example: '2026-11-16T09:00:00.000Z',
    description: 'Thời điểm hoàn tất xử lý (null khi ở trạng thái trung gian in_review)',
  })
  resolvedAt!: Date | null;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'Đã cập nhật lại đáp án chính xác.',
  })
  resolutionNote!: string | null;

  @ApiProperty({
    example: 3,
    description:
      'Số lượng báo cáo đang mở KHÁC (id != :id) của cùng câu hỏi được đóng kèm khi resolveAllForQuestion = true (PMR 031)',
  })
  bulkResolvedCount!: number;
}
