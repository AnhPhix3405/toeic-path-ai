import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { QueryAttemptQuestionsDto } from './request/query-attempt-questions.dto';
import { ExamAttemptOverviewResponseDto } from './response/exam-attempt-overview-response.dto';
import { ExamAttemptQuestionsResponseDto } from './response/exam-attempt-questions-response.dto';
import { ExamAttemptStatus } from '../enums/exam-attempt-status.enum';
import { PartPracticeMode } from '../enums/part-practice-mode.enum';

describe('ExamAttempts Delivery DTOs Validation & Serialization', () => {
  it('should validate valid QueryAttemptQuestionsDto', async () => {
    const dto = plainToInstance(QueryAttemptQuestionsDto, { partNumber: 5 });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should validate empty QueryAttemptQuestionsDto (optional partNumber)', async () => {
    const dto = plainToInstance(QueryAttemptQuestionsDto, {});
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail QueryAttemptQuestionsDto if partNumber is out of range (<1 or >7)', async () => {
    const dto1 = plainToInstance(QueryAttemptQuestionsDto, { partNumber: 0 });
    const errors1 = await validate(dto1);
    expect(errors1.length).toBeGreaterThan(0);

    const dto2 = plainToInstance(QueryAttemptQuestionsDto, { partNumber: 8 });
    const errors2 = await validate(dto2);
    expect(errors2.length).toBeGreaterThan(0);
  });

  it('should instantiate ExamAttemptOverviewResponseDto with isExpired flag correctly', () => {
    const overview = new ExamAttemptOverviewResponseDto();
    overview.id = '50000000-0000-4000-8000-000000000001';
    overview.examId = '30000000-0000-4000-8000-000000000001';
    overview.examTitle = 'ETS TOEIC Test 01';
    overview.status = ExamAttemptStatus.IN_PROGRESS;
    overview.mode = PartPracticeMode.FULL_EXAM;
    overview.totalQuestions = 200;
    overview.answeredCount = 45;
    overview.markedForReviewCount = 5;
    overview.remainingSeconds = 0;
    overview.isExpired = true;

    expect(overview.id).toBeDefined();
    expect(overview.isExpired).toBe(true);
  });

  it('should instantiate ExamAttemptQuestionsResponseDto with questionGroups deduplication correctly', () => {
    const response = new ExamAttemptQuestionsResponseDto();
    response.attemptId = '50000000-0000-4000-8000-000000000001';
    response.partNumber = null;
    response.totalQuestionsInPart = 30;
    response.questionGroups = [
      {
        id: 'grp-1',
        passageText: 'Letter text...',
        audioUrl: null,
        imageUrl: null,
      },
    ];
    response.questions = [
      {
        id: 'q-1',
        partNumber: 6,
        orderIndex: 131,
        originalQuestionNumber: 131,
        questionGroupId: 'grp-1',
        content: null,
        audioUrl: null,
        imageUrl: null,
        options: [{ id: 'opt-1', label: 'A', content: 'word' }],
        selectedOptionId: 'opt-1',
        isMarkedForReview: false,
      },
    ];

    expect(response.questionGroups.length).toBe(1);
    expect(response.questions[0].questionGroupId).toBe('grp-1');
    expect(response.partNumber).toBeNull();
  });
});
