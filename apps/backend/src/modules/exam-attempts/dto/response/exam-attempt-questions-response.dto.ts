import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class QuestionOptionItemDto {
  @ApiProperty({ example: '10000000-0000-4000-8000-000000000001' })
  id!: string;

  @ApiProperty({ example: 'A' })
  label!: string;

  @ApiPropertyOptional({
    example: 'has delivered',
    nullable: true,
    description: 'Nội dung text của lựa chọn (có thể null đối với Part 1, Part 2 theo Rule #1002)',
  })
  content?: string | null;
}

export class QuestionGroupDeliveryDto {
  @ApiProperty({ example: '60000000-0000-4000-8000-000000000001' })
  id!: string;

  @ApiPropertyOptional({ example: 'Questions 131-134 refer to the following letter...' })
  passageText?: string | null;

  @ApiPropertyOptional({ example: 'https://storage.toeicpath.ai/audio/part3-conversation-01.mp3' })
  audioUrl?: string | null;

  @ApiPropertyOptional({ example: 'https://storage.toeicpath.ai/images/part7-article-01.png' })
  imageUrl?: string | null;
}

export class QuestionDeliveryItemDto {
  @ApiProperty({ example: '20000000-0000-4000-8000-000000000001' })
  id!: string;

  @ApiProperty({ example: 5 })
  partNumber!: number;

  @ApiProperty({
    example: 101,
    description: 'Số thứ tự hiển thị trong bài thi (chạy liên tục từ 1..N)',
  })
  orderIndex!: number;

  @ApiPropertyOptional({ example: 101, description: 'Số câu TOEIC thực tế trên đề thi (VD: 101)' })
  originalQuestionNumber?: number;

  @ApiPropertyOptional({
    example: '60000000-0000-4000-8000-000000000001',
    nullable: true,
    description: 'ID của nhóm câu hỏi nếu câu này thuộc bài đọc/hội thoại chung (Part 3, 4, 6, 7)',
  })
  questionGroupId?: string | null;

  @ApiPropertyOptional({
    example: 'The package was ------- to the wrong address yesterday.',
    nullable: true,
    description:
      'Nội dung câu hỏi (null đối với Part 1, Part 2, và câu con Part 6 theo Rule #1002)',
  })
  content?: string | null;

  @ApiPropertyOptional({ example: 'https://storage.toeicpath.ai/audio/q1.mp3' })
  audioUrl?: string | null;

  @ApiPropertyOptional({ example: 'https://storage.toeicpath.ai/images/q1.png' })
  imageUrl?: string | null;

  @ApiProperty({ type: [QuestionOptionItemDto] })
  options!: QuestionOptionItemDto[];

  @ApiPropertyOptional({
    example: '10000000-0000-4000-8000-000000000001',
    nullable: true,
    description: 'Đáp án học viên đã lưu trước đó nếu có (phục vụ khôi phục giao diện khi F5)',
  })
  selectedOptionId?: string | null;

  @ApiPropertyOptional({
    example: false,
    description: 'Đã được học viên đánh dấu xem lại hay chưa',
  })
  isMarkedForReview?: boolean;
}

export class ExamAttemptQuestionsResponseDto {
  @ApiProperty({ example: '50000000-0000-4000-8000-000000000001' })
  attemptId!: string;

  @ApiPropertyOptional({
    example: 5,
    nullable: true,
    description: 'Part number được lọc, hoặc null nếu lấy toàn bộ đề',
  })
  partNumber?: number | null;

  @ApiProperty({ example: 30, description: 'Tổng số câu hỏi trả về trong payload' })
  totalQuestionsInPart!: number;

  @ApiProperty({
    type: [QuestionGroupDeliveryDto],
    description:
      'Danh sách bài đọc/hội thoại dùng chung (Part 3, 4, 6, 7) đã được deduplicate tối ưu payload và hỗ trợ Split-View UI (PMR 018)',
  })
  questionGroups!: QuestionGroupDeliveryDto[];

  @ApiProperty({ type: [QuestionDeliveryItemDto] })
  questions!: QuestionDeliveryItemDto[];
}
