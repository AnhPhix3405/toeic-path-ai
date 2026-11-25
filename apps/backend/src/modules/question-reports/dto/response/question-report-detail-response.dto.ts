import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuestionStatus } from '../../../questions/enums/question-status.enum';
import { QuestionType } from '../../../questions/enums/question-type.enum';
import { QuestionReportReason } from '../../enums/question-report-reason.enum';
import { QuestionReportStatus } from '../../enums/question-report-status.enum';

export class QuestionReportOptionContextDto {
  @ApiProperty({ example: '10000000-0000-4000-8000-000000000001' })
  id!: string;

  @ApiProperty({ example: 'A' })
  label!: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'delivered',
    description: 'Nội dung phương án (có thể null đối với Part 1, Part 2 theo Rule #1002)',
  })
  content!: string | null;

  @ApiProperty({ example: true })
  isCorrect!: boolean;

  @ApiProperty({ example: 1 })
  position!: number;
}

export class QuestionReportGroupContextDto {
  @ApiProperty({ example: '60000000-0000-4000-8000-000000000001' })
  id!: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'Questions 32-34 refer to the following conversation.',
  })
  title!: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'Questions 131-134 refer to the following letter...',
  })
  passageText!: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'https://storage.toeicpath.ai/audio/part3.mp3',
  })
  audioUrl!: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'https://storage.toeicpath.ai/images/part7.png',
  })
  imageUrl!: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'M: Hello, I am calling about the office furniture order...',
  })
  transcript!: string | null;
}

export class QuestionReportQuestionContextDto {
  @ApiProperty({ example: '20000000-0000-4000-8000-000000000001' })
  id!: string;

  @ApiPropertyOptional({ example: 'Q-00001', description: 'Mã ngắn định danh câu hỏi' })
  questionCode?: string;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 5,
    description: 'Số thứ tự Part TOEIC (1..7)',
  })
  partNumber!: number | null;

  @ApiProperty({ enum: QuestionType, example: QuestionType.SINGLE_CHOICE })
  questionType!: QuestionType;

  @ApiProperty({ enum: QuestionStatus, example: QuestionStatus.PUBLISHED })
  status!: QuestionStatus;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'The package was ------- to the wrong address yesterday.',
    description: 'Nội dung câu hỏi (null đối với Part 1, Part 2 và câu con Part 6 theo Rule #1002)',
  })
  content!: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'Câu bị động quá khứ đơn: was + V3/ed.',
  })
  explanation!: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'https://storage.toeicpath.ai/audio/q1.mp3',
  })
  audioUrl!: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'https://storage.toeicpath.ai/images/q1.png',
  })
  imageUrl!: string | null;

  @ApiProperty({ type: [QuestionReportOptionContextDto] })
  options!: QuestionReportOptionContextDto[];

  @ApiPropertyOptional({
    type: QuestionReportGroupContextDto,
    nullable: true,
    description: 'Ngữ cảnh nhóm câu hỏi nếu thuộc Part 3, 4, 6, 7',
  })
  questionGroup!: QuestionReportGroupContextDto | null;
}

export class QuestionReportDetailResponseDto {
  @ApiProperty({ example: '70000000-0000-4000-8000-000000000001' })
  id!: string;

  @ApiPropertyOptional({ example: 'RP-00001', description: 'Mã ngắn định danh báo cáo câu hỏi' })
  reportCode?: string;

  @ApiProperty({ example: '20000000-0000-4000-8000-000000000001' })
  questionId!: string;

  @ApiPropertyOptional({ example: 'Q-00001', description: 'Mã ngắn định danh câu hỏi' })
  questionCode?: string;

  @ApiProperty({ example: '30000000-0000-4000-8000-000000000001' })
  reporterId!: string;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'student@example.com',
  })
  reporterEmail!: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    example: '50000000-0000-4000-8000-000000000001',
  })
  attemptId!: string | null;

  @ApiProperty({ enum: QuestionReportReason, example: QuestionReportReason.WRONG_ANSWER })
  reason!: QuestionReportReason;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'Đáp án đúng phải là phương án B.',
  })
  description!: string | null;

  @ApiProperty({ enum: QuestionReportStatus, example: QuestionReportStatus.PENDING })
  status!: QuestionReportStatus;

  @ApiProperty({
    type: String,
    nullable: true,
    example: '40000000-0000-4000-8000-000000000001',
  })
  resolvedById!: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'teacher@example.com',
  })
  resolvedByEmail!: string | null;

  @ApiProperty({
    type: Date,
    nullable: true,
    example: null,
  })
  resolvedAt!: Date | null;

  @ApiProperty({
    type: String,
    nullable: true,
    example: null,
  })
  resolutionNote!: string | null;

  @ApiProperty({ example: '2026-11-16T08:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-11-16T08:00:00.000Z' })
  updatedAt!: Date;

  @ApiProperty({
    type: QuestionReportQuestionContextDto,
    description: 'Toàn bộ ngữ cảnh câu hỏi, đáp án, lời giải và nhóm bài đọc/hội thoại hiện tại',
  })
  question!: QuestionReportQuestionContextDto;
}
