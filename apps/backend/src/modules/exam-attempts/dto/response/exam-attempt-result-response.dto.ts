import { ApiProperty } from '@nestjs/swagger';
import { ScoreConversionType } from '../../../exams/enums/score-conversion-type.enum';
import { ExamAttemptStatus } from '../../enums/exam-attempt-status.enum';
import { PartPracticeMode } from '../../enums/part-practice-mode.enum';
import {
  PartBreakdownItem,
  SkillBreakdownItem,
} from '../../interfaces/attempt-breakdown.interface';

export class PartBreakdownResponseDto implements PartBreakdownItem {
  @ApiProperty({ example: 5, description: 'Số thứ tự Part TOEIC (1..7)' })
  partNumber!: number;

  @ApiProperty({ example: 30, description: 'Tổng số câu hỏi của Part' })
  total!: number;

  @ApiProperty({ example: 24, description: 'Số câu trả lời đúng' })
  correct!: number;

  @ApiProperty({ example: 4, description: 'Số câu trả lời sai' })
  wrong!: number;

  @ApiProperty({ example: 2, description: 'Số câu bỏ trống' })
  skipped!: number;

  @ApiProperty({ example: 80, description: 'Tỷ lệ chính xác của Part (%)' })
  accuracy!: number;

  @ApiProperty({ example: 25, description: 'Thời gian làm bài trung bình mỗi câu (giây)' })
  avgTimeSeconds!: number;
}

export class SkillBreakdownResponseDto implements SkillBreakdownItem {
  @ApiProperty({
    example: '30000000-0000-4000-8000-000000000001',
    description: 'ID kỹ năng',
  })
  skillId!: string;

  @ApiProperty({ example: 'GRAMMAR_TENSE', description: 'Mã kỹ năng' })
  skillCode!: string;

  @ApiProperty({ example: 'Thì động từ', description: 'Tên hiển thị của kỹ năng' })
  skillName!: string;

  @ApiProperty({ example: 10, description: 'Tổng số câu gắn kỹ năng này' })
  total!: number;

  @ApiProperty({ example: 8, description: 'Số câu trả lời đúng' })
  correct!: number;

  @ApiProperty({ example: 1, description: 'Số câu trả lời sai' })
  wrong!: number;

  @ApiProperty({ example: 1, description: 'Số câu bỏ trống' })
  skipped!: number;

  @ApiProperty({ example: 80, description: 'Tỷ lệ chính xác của kỹ năng (%)' })
  accuracy!: number;
}

export class ExamAttemptResultResponseDto {
  @ApiProperty({
    example: '50000000-0000-4000-8000-000000000001',
    description: 'ID của lượt làm bài thi',
  })
  attemptId!: string;

  @ApiProperty({
    example: '10000000-0000-4000-8000-000000000001',
    description: 'ID của đề thi gốc',
  })
  examId!: string;

  @ApiProperty({
    example: 'ETS TOEIC 2026 Test 1',
    description: 'Tiêu đề đề thi',
  })
  examTitle!: string;

  @ApiProperty({
    enum: PartPracticeMode,
    example: PartPracticeMode.FULL_EXAM,
    description: 'Chế độ làm bài (full_exam | part_practice)',
  })
  mode!: PartPracticeMode;

  @ApiProperty({
    type: [Number],
    nullable: true,
    example: null,
    description: 'Danh sách các Part được chọn khi luyện tập theo Part (null nếu full_exam)',
  })
  selectedParts!: number[] | null;

  @ApiProperty({
    enum: ScoreConversionType,
    example: ScoreConversionType.DEFAULT_ETS,
    description: 'Loại quy đổi điểm của đề thi',
  })
  scoreConversionType!: ScoreConversionType;

  @ApiProperty({
    enum: ExamAttemptStatus,
    example: ExamAttemptStatus.SUBMITTED,
    description: 'Trạng thái sau khi nộp bài (submitted | timed_out)',
  })
  status!: ExamAttemptStatus;

  @ApiProperty({
    example: '2026-11-15T08:00:00.000Z',
    description: 'Thời điểm bắt đầu làm bài',
  })
  startedAt!: Date;

  @ApiProperty({
    example: '2026-11-15T09:55:00.000Z',
    description: 'Thời điểm nộp bài',
  })
  submittedAt!: Date;

  @ApiProperty({
    example: '2026-11-15T09:55:00.000Z',
    description: 'Thời điểm chấm điểm hoàn tất',
  })
  gradedAt!: Date;

  @ApiProperty({
    example: 6900,
    description: 'Thời gian thực tế làm bài tính bằng giây',
  })
  durationSpentSeconds!: number;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 785,
    description:
      'Tổng điểm TOEIC (10–990) hoặc null nếu part_practice / RAW_PERCENTAGE / đề 1 kỹ năng',
  })
  totalScore!: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 410,
    description: 'Điểm kỹ năng Nghe (5–495) hoặc null',
  })
  listeningScore!: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 375,
    description: 'Điểm kỹ năng Đọc (5–495) hoặc null',
  })
  readingScore!: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 650,
    description: 'Điểm chuẩn đạt yêu cầu của đề thi hoặc null',
  })
  passingScore!: number | null;

  @ApiProperty({
    type: Boolean,
    nullable: true,
    example: true,
    description: 'Kết quả đạt/trượt so với passingScore của đề thi (hoặc null)',
  })
  isPassed!: boolean | null;

  @ApiProperty({
    example: 200,
    description: 'Tổng số câu hỏi trong lượt thi',
  })
  totalQuestions!: number;

  @ApiProperty({
    example: 155,
    description: 'Số câu trả lời đúng',
  })
  correctCount!: number;

  @ApiProperty({
    example: 35,
    description: 'Số câu trả lời sai',
  })
  wrongCount!: number;

  @ApiProperty({
    example: 10,
    description: 'Số câu bỏ trống',
  })
  skippedCount!: number;

  @ApiProperty({
    example: 77.5,
    description: 'Tỷ lệ trả lời đúng (%) làm tròn 2 chữ số thập phân',
  })
  accuracyPercentage!: number;

  @ApiProperty({
    type: [PartBreakdownResponseDto],
    description: 'Phân tích chi tiết theo từng Part TOEIC (sắp xếp theo partNumber ASC)',
  })
  partBreakdown!: PartBreakdownResponseDto[];

  @ApiProperty({
    type: [SkillBreakdownResponseDto],
    description: 'Phân tích chi tiết theo từng kỹ năng (sắp xếp theo skillCode ASC)',
  })
  skillBreakdown!: SkillBreakdownResponseDto[];
}
