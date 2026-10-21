import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExamType } from '../../enums/exam-type.enum';
import { ExamStatus } from '../../enums/exam-status.enum';
import { ExamSectionResponseDto } from './exam-detail-response.dto';

export class ExamQuestionResponseDto {
  @ApiProperty({ example: '50000000-0000-4000-8000-000000000001' })
  id!: string;

  @ApiProperty({ example: '10000000-0000-4000-8000-000000000001' })
  examId!: string;

  @ApiProperty({ example: '20000000-0000-4000-8000-000000000001' })
  examSectionId!: string;

  @ApiProperty({ example: '30000000-0000-4000-8000-000000000001' })
  questionId!: string;

  @ApiProperty({ example: 1 })
  orderIndex!: number;

  @ApiPropertyOptional({ example: '40000000-0000-4000-8000-000000000001', nullable: true })
  questionGroupId!: string | null;

  @ApiPropertyOptional({ example: 1, nullable: true })
  groupOrder!: number | null;

  @ApiPropertyOptional({ example: 1 })
  partNumber?: number;

  @ApiPropertyOptional({ example: 'medium' })
  difficulty?: string;

  @ApiPropertyOptional({ example: 'Where is the meeting taking place?', nullable: true })
  content?: string | null;
}

export class ExamStructureResponseDto {
  @ApiProperty({ example: '10000000-0000-4000-8000-000000000001' })
  id!: string;

  @ApiProperty({ example: 'ETS TOEIC 2026 Test 01' })
  title!: string;

  @ApiProperty({ enum: ExamType, example: ExamType.FULL_TEST })
  type!: ExamType;

  @ApiProperty({ enum: ExamStatus, example: ExamStatus.DRAFT })
  status!: ExamStatus;

  @ApiProperty({ example: 2 })
  version!: number;

  @ApiProperty({ example: 200 })
  totalQuestions!: number;

  @ApiProperty({ type: [ExamSectionResponseDto] })
  sections!: ExamSectionResponseDto[];

  @ApiProperty({ type: [ExamQuestionResponseDto] })
  questions!: ExamQuestionResponseDto[];
}
