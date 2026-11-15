import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReviewFilterCountsDto {
  @ApiProperty({ example: 200, description: 'Tổng số câu hỏi trong phạm vi đang xét' })
  all!: number;

  @ApiProperty({ example: 150, description: 'Số câu trả lời đúng' })
  correct!: number;

  @ApiProperty({
    example: 40,
    description: 'Số câu trả lời sai (đã chọn phương án nhưng không khớp đáp án đúng)',
  })
  wrong!: number;

  @ApiProperty({ example: 10, description: 'Số câu bỏ trống (selectedOptionId = null)' })
  skipped!: number;

  @ApiProperty({ example: 12, description: 'Số câu được đánh dấu xem lại' })
  marked!: number;
}

export class QuestionOptionReviewDto {
  @ApiProperty({ example: '10000000-0000-4000-8000-000000000001' })
  id!: string;

  @ApiProperty({ example: 'A' })
  label!: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'has delivered',
    description: 'Nội dung phương án (có thể null đối với Part 1, Part 2 theo Rule #1002)',
  })
  content?: string | null;

  @ApiProperty({
    example: true,
    description: 'Cờ đánh dấu đây có phải là đáp án đúng của câu hỏi hay không',
  })
  isCorrect!: boolean;
}

export class QuestionGroupReviewDto {
  @ApiProperty({ example: '60000000-0000-4000-8000-000000000001' })
  id!: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'Questions 32-34 refer to the following conversation.',
  })
  title?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'Questions 131-134 refer to the following letter...',
  })
  passageText?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'https://storage.toeicpath.ai/audio/part3-conversation-01.mp3',
  })
  audioUrl?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'https://storage.toeicpath.ai/images/part7-article-01.png',
  })
  imageUrl?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'M: Hello, I am calling about the office furniture order...',
    description: 'Lời thoại (tapescript) của hội thoại/bài nói Part 3, Part 4',
  })
  transcript?: string | null;
}

export class QuestionReviewItemDto {
  @ApiProperty({ example: '20000000-0000-4000-8000-000000000001' })
  id!: string;

  @ApiProperty({ example: 5 })
  partNumber!: number;

  @ApiProperty({
    example: 101,
    description: 'Số thứ tự hiển thị trong bài thi (chạy liên tục từ 1..N)',
  })
  orderIndex!: number;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    example: 101,
    description: 'Số câu TOEIC gốc trên đề thi',
  })
  originalQuestionNumber?: number | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: '60000000-0000-4000-8000-000000000001',
    description: 'ID của nhóm câu hỏi nếu thuộc Part 3, 4, 6, 7',
  })
  questionGroupId?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'The package was ------- to the wrong address yesterday.',
    description: 'Nội dung câu hỏi (null đối với Part 1, Part 2 và câu con Part 6 theo Rule #1002)',
  })
  content?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'https://storage.toeicpath.ai/audio/q1.mp3',
  })
  audioUrl?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'https://storage.toeicpath.ai/images/q1.png',
  })
  imageUrl?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: '(A) He is typing on a keyboard. (B) He is looking at a monitor...',
    description: 'Lời thoại (tapescript) cho câu hỏi đơn có âm thanh (Part 1, Part 2)',
  })
  transcript?: string | null;

  @ApiProperty({
    type: [QuestionOptionReviewDto],
    description: 'Danh sách phương án giữ nguyên thứ tự A–D từ Snapshot kèm cờ isCorrect',
  })
  options!: QuestionOptionReviewDto[];

  @ApiProperty({
    type: String,
    nullable: true,
    example: '10000000-0000-4000-8000-000000000001',
    description: 'ID phương án học viên đã chọn (null nếu bỏ trống)',
  })
  selectedOptionId!: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    example: '10000000-0000-4000-8000-000000000001',
    description: 'ID phương án đúng theo answerKeySnapshot',
  })
  correctOptionId!: string | null;

  @ApiProperty({
    example: true,
    description: 'Kết quả câu trả lời (false nếu chọn sai hoặc bỏ trống)',
  })
  isCorrect!: boolean;

  @ApiProperty({
    example: false,
    description: 'Cờ đánh dấu xem lại của học viên',
  })
  isMarkedForReview!: boolean;

  @ApiProperty({
    example: 18,
    description: 'Thời gian học viên đã dành cho câu hỏi này (giây)',
  })
  timeSpentSeconds!: number;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'Câu bị động ở thì quá khứ đơn: was + V3/ed (delivered).',
    description: 'Giải thích chi tiết đáp án',
  })
  explanation?: string | null;
}

export class ExamAttemptReviewResponseDto {
  @ApiProperty({ example: '50000000-0000-4000-8000-000000000001' })
  attemptId!: string;

  @ApiProperty({
    type: ReviewFilterCountsDto,
    description: 'Bộ đếm số câu theo từng tab lọc trong phạm vi đang xem',
  })
  filterCounts!: ReviewFilterCountsDto;

  @ApiProperty({
    type: [QuestionGroupReviewDto],
    description: 'Danh sách nhóm đoạn văn/hội thoại đã được deduplicate SAU KHI lọc câu hỏi',
  })
  questionGroups!: QuestionGroupReviewDto[];

  @ApiProperty({
    type: [QuestionReviewItemDto],
    description: 'Danh sách câu hỏi sau khi áp dụng bộ lọc kèm đáp án đúng và giải thích',
  })
  questions!: QuestionReviewItemDto[];
}
