import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateExamAttemptDto } from './request/create-exam-attempt.dto';
import { ExamAttemptSummaryResponseDto } from './response/exam-attempt-summary-response.dto';
import { AbandonAttemptResponseDto } from './response/abandon-attempt-response.dto';
import { PartPracticeMode } from '../enums/part-practice-mode.enum';
import { ExamAttemptStatus } from '../enums/exam-attempt-status.enum';

describe('ExamAttempts DTOs Validation & Serialization', () => {
  it('should validate valid CreateExamAttemptDto for full_exam', async () => {
    const dto = plainToInstance(CreateExamAttemptDto, {
      examId: '30000000-0000-4000-8000-000000000001',
      mode: PartPracticeMode.FULL_EXAM,
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail CreateExamAttemptDto if mode is part_practice but selectedParts is missing or empty', async () => {
    const dto = plainToInstance(CreateExamAttemptDto, {
      examId: '30000000-0000-4000-8000-000000000001',
      mode: PartPracticeMode.PART_PRACTICE,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should validate valid CreateExamAttemptDto for part_practice with valid parts', async () => {
    const dto = plainToInstance(CreateExamAttemptDto, {
      examId: '30000000-0000-4000-8000-000000000001',
      mode: PartPracticeMode.PART_PRACTICE,
      selectedParts: [5, 6],
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail CreateExamAttemptDto if selectedParts contains invalid part number (<1 or >7)', async () => {
    const dto = plainToInstance(CreateExamAttemptDto, {
      examId: '30000000-0000-4000-8000-000000000001',
      mode: PartPracticeMode.PART_PRACTICE,
      selectedParts: [0, 8],
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should instantiate ExamAttemptSummaryResponseDto and AbandonAttemptResponseDto correctly', () => {
    const summary = new ExamAttemptSummaryResponseDto();
    summary.attemptId = '50000000-0000-4000-8000-000000000001';
    summary.examId = '30000000-0000-4000-8000-000000000001';
    summary.examTitle = 'ETS TOEIC 2026 Test 01';
    summary.status = ExamAttemptStatus.IN_PROGRESS;
    summary.mode = PartPracticeMode.FULL_EXAM;
    summary.totalQuestions = 200;
    summary.remainingSeconds = 7200;
    summary.isResumed = false;

    expect(summary.attemptId).toBeDefined();
    expect(summary.isResumed).toBe(false);

    const abandon = new AbandonAttemptResponseDto();
    abandon.success = true;
    abandon.message = 'Đã hủy bài thi thành công';
    abandon.abandonedAt = new Date();

    expect(abandon.success).toBe(true);
  });
});
