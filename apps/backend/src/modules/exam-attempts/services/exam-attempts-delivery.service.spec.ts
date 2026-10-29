import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ExamAttemptsDeliveryService } from './exam-attempts-delivery.service';
import { ExamAttempt } from '../entities/exam-attempt.entity';
import { ExamAttemptSnapshot } from '../entities/exam-attempt-snapshot.entity';
import { ExamAttemptAnswer } from '../entities/exam-attempt-answer.entity';
import { ExamAttemptStatus } from '../enums/exam-attempt-status.enum';
import { PartPracticeMode } from '../enums/part-practice-mode.enum';

describe('ExamAttemptsDeliveryService', () => {
  let service: ExamAttemptsDeliveryService;
  let attemptRepoMock: any;
  let snapshotRepoMock: any;
  let answerRepoMock: any;

  const mockAttempt = {
    id: '50000000-0000-4000-8000-000000000001',
    userId: 'user-uuid-1',
    examId: '30000000-0000-4000-8000-000000000001',
    exam: {
      title: 'ETS TOEIC Test 01',
    },
    status: ExamAttemptStatus.IN_PROGRESS,
    mode: PartPracticeMode.PART_PRACTICE,
    selectedParts: [5, 6],
    totalQuestions: 46,
    startedAt: new Date(Date.now() - 600 * 1000),
    expiresAt: new Date(Date.now() + 3600 * 1000),
  };

  const mockShuffledQuestions = [
    {
      id: 'q-101',
      partNumber: 5,
      orderIndex: 1,
      originalQuestionNumber: 101,
      questionGroupId: null,
      content: 'The package was ------- to the office.',
      options: [
        { id: 'opt-1', label: 'A', content: 'sent' },
        { id: 'opt-2', label: 'B', content: 'send' },
      ],
      questionGroup: null,
    },
    {
      id: 'q-131',
      partNumber: 6,
      orderIndex: 31,
      originalQuestionNumber: 131,
      questionGroupId: 'grp-1',
      content: null,
      options: [
        { id: 'opt-3', label: 'A', content: 'effective' },
        { id: 'opt-4', label: 'B', content: 'efficient' },
      ],
      questionGroup: {
        id: 'grp-1',
        passageText: 'Reading passage for questions 131-134...',
        audioUrl: null,
        imageUrl: null,
      },
    },
    {
      id: 'q-132',
      partNumber: 6,
      orderIndex: 32,
      originalQuestionNumber: 132,
      questionGroupId: 'grp-1',
      content: null,
      options: [
        { id: 'opt-5', label: 'A', content: 'however' },
        { id: 'opt-6', label: 'B', content: 'therefore' },
      ],
      questionGroup: {
        id: 'grp-1',
        passageText: 'Reading passage for questions 131-134...',
        audioUrl: null,
        imageUrl: null,
      },
    },
  ];

  const mockSnapshot = {
    id: 'snap-uuid-1',
    attemptId: mockAttempt.id,
    shuffledQuestions: mockShuffledQuestions,
  };

  const mockAnswers = [
    {
      id: 'ans-1',
      attemptId: mockAttempt.id,
      questionId: 'q-101',
      selectedOptionId: 'opt-1',
      isMarkedForReview: true,
    },
  ];

  beforeEach(async () => {
    attemptRepoMock = {
      findOne: jest.fn(),
    };

    snapshotRepoMock = {
      findOne: jest.fn(),
    };

    answerRepoMock = {
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExamAttemptsDeliveryService,
        { provide: getRepositoryToken(ExamAttempt), useValue: attemptRepoMock },
        { provide: getRepositoryToken(ExamAttemptSnapshot), useValue: snapshotRepoMock },
        { provide: getRepositoryToken(ExamAttemptAnswer), useValue: answerRepoMock },
      ],
    }).compile();

    service = module.get<ExamAttemptsDeliveryService>(ExamAttemptsDeliveryService);
  });

  describe('getAttemptOverview', () => {
    it('should throw NotFoundException if attempt is not found', async () => {
      attemptRepoMock.findOne.mockResolvedValue(null);

      await expect(service.getAttemptOverview('user-uuid-1', 'invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if user is not attempt owner and not admin', async () => {
      attemptRepoMock.findOne.mockResolvedValue(mockAttempt);

      await expect(
        service.getAttemptOverview('different-user-id', mockAttempt.id, false),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return overview with full questionsProgress matrix (PMR 022)', async () => {
      attemptRepoMock.findOne.mockResolvedValue(mockAttempt);
      answerRepoMock.find.mockResolvedValue(mockAnswers);
      snapshotRepoMock.findOne.mockResolvedValue(mockSnapshot);

      const overview = await service.getAttemptOverview('user-uuid-1', mockAttempt.id);

      expect(overview.id).toBe(mockAttempt.id);
      expect(overview.answeredCount).toBe(1);
      expect(overview.markedForReviewCount).toBe(1);
      expect(overview.isExpired).toBe(false);
      expect(overview.remainingSeconds).toBeGreaterThan(0);

      // Verify all 3 questions from snapshot are present in questionsProgress
      expect(overview.questionsProgress.length).toBe(3);
      expect(overview.questionsProgress[0].questionId).toBe('q-101');
      expect(overview.questionsProgress[0].isAnswered).toBe(true);
      expect(overview.questionsProgress[0].isMarkedForReview).toBe(true);

      expect(overview.questionsProgress[1].questionId).toBe('q-131');
      expect(overview.questionsProgress[1].isAnswered).toBe(false);
      expect(overview.questionsProgress[1].isMarkedForReview).toBe(false);
    });

    it('should set remainingSeconds = 0 and isExpired = true if expired by more than 30s', async () => {
      const expiredAttempt = {
        ...mockAttempt,
        expiresAt: new Date(Date.now() - 35 * 1000), // Expired 35 seconds ago
      };

      attemptRepoMock.findOne.mockResolvedValue(expiredAttempt);
      answerRepoMock.find.mockResolvedValue([]);
      snapshotRepoMock.findOne.mockResolvedValue(mockSnapshot);

      const overview = await service.getAttemptOverview('user-uuid-1', mockAttempt.id);

      expect(overview.remainingSeconds).toBe(0);
      expect(overview.isExpired).toBe(true);
    });
  });

  describe('getAttemptQuestions', () => {
    it('should throw BadRequestException (ERR_PART_NOT_IN_ATTEMPT) if partNumber not in selectedParts (PMR 018)', async () => {
      attemptRepoMock.findOne.mockResolvedValue(mockAttempt); // selectedParts is [5, 6]

      await expect(
        service.getAttemptQuestions('user-uuid-1', mockAttempt.id, { partNumber: 2 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should deduplicate questionGroups using Map and populate saved answers (PMR 018 & PMR 022)', async () => {
      attemptRepoMock.findOne.mockResolvedValue(mockAttempt);
      snapshotRepoMock.findOne.mockResolvedValue(mockSnapshot);
      answerRepoMock.find.mockResolvedValue(mockAnswers);

      const response = await service.getAttemptQuestions('user-uuid-1', mockAttempt.id, {});

      expect(response.attemptId).toBe(mockAttempt.id);
      expect(response.questions.length).toBe(3);

      // Verify Deduplication: grp-1 only appears ONCE in questionGroups array
      expect(response.questionGroups.length).toBe(1);
      expect(response.questionGroups[0].id).toBe('grp-1');
      expect(response.questionGroups[0].passageText).toContain('Reading passage');

      // Verify questions only carry questionGroupId and saved answers
      expect(response.questions[0].id).toBe('q-101');
      expect(response.questions[0].selectedOptionId).toBe('opt-1');
      expect(response.questions[0].isMarkedForReview).toBe(true);

      expect(response.questions[1].id).toBe('q-131');
      expect(response.questions[1].questionGroupId).toBe('grp-1');
      expect(response.questions[1].selectedOptionId).toBeNull();
      expect(response.questions[1].isMarkedForReview).toBe(false);

      expect(response.questions[2].id).toBe('q-132');
      expect(response.questions[2].questionGroupId).toBe('grp-1');
    });

    it('should filter questions by partNumber if provided', async () => {
      attemptRepoMock.findOne.mockResolvedValue(mockAttempt);
      snapshotRepoMock.findOne.mockResolvedValue(mockSnapshot);
      answerRepoMock.find.mockResolvedValue([]);

      const response = await service.getAttemptQuestions('user-uuid-1', mockAttempt.id, {
        partNumber: 5,
      });

      expect(response.partNumber).toBe(5);
      expect(response.questions.length).toBe(1);
      expect(response.questions[0].id).toBe('q-101');
      expect(response.questionGroups.length).toBe(0); // Part 5 has no questionGroup
    });
  });
});
