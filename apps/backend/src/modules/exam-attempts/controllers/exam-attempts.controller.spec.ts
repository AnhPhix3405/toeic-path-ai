import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Request, Response } from 'express';
import { ExamAttemptsController } from './exam-attempts.controller';
import { ExamAttemptsService } from '../services/exam-attempts.service';
import { ExamAttemptsDeliveryService } from '../services/exam-attempts-delivery.service';
import { ExamAttemptsAnswersService } from '../services/exam-attempts-answers.service';
import { ExamAttemptsSubmissionService } from '../services/exam-attempts-submission.service';
import { ExamAttemptsResultsService } from '../services/exam-attempts-results.service';
import { CreateExamAttemptDto } from '../dto/request/create-exam-attempt.dto';
import { QueryAttemptQuestionsDto } from '../dto/request/query-attempt-questions.dto';
import { QueryAttemptHistoryDto } from '../dto/request/query-attempt-history.dto';
import { QueryAttemptReviewDto } from '../dto/request/query-attempt-review.dto';
import { SaveAnswerDto } from '../dto/request/save-answer.dto';
import { BatchSaveAnswersDto } from '../dto/request/batch-save-answers.dto';
import { PartPracticeMode } from '../enums/part-practice-mode.enum';
import { ExamAttemptStatus } from '../enums/exam-attempt-status.enum';
import { AttemptReviewFilter } from '../enums/attempt-review-filter.enum';
import { UserRole } from '../../../common/enums/user-role.enum';
import { UserStatus } from '../../../common/enums/user-status.enum';
import type { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PolicyThrottlerGuard } from '../../../common/rate-limit/guards/policy-throttler.guard';

describe('ExamAttemptsController', () => {
  let controller: ExamAttemptsController;
  let serviceMock: {
    startAttempt: jest.Mock;
    abandonAttempt: jest.Mock;
  };
  let deliveryServiceMock: {
    getAttemptOverview: jest.Mock;
    getAttemptQuestions: jest.Mock;
  };
  let answersServiceMock: {
    saveAnswer: jest.Mock;
    batchSaveAnswers: jest.Mock;
  };
  let submissionServiceMock: {
    submitAttempt: jest.Mock;
  };
  let resultsServiceMock: {
    getAttemptResult: jest.Mock;
    getAttemptHistory: jest.Mock;
    getAttemptReview: jest.Mock;
  };

  const mockUser: AuthenticatedUser = {
    id: 'user-uuid-1',
    sessionId: 'sess-1',
    email: 'student@example.com',
    role: UserRole.STUDENT,
    status: UserStatus.ACTIVE,
  };

  const mockAdmin: AuthenticatedUser = {
    id: 'admin-uuid-1',
    sessionId: 'sess-2',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
  };

  beforeEach(async () => {
    serviceMock = {
      startAttempt: jest.fn(),
      abandonAttempt: jest.fn(),
    };

    deliveryServiceMock = {
      getAttemptOverview: jest.fn(),
      getAttemptQuestions: jest.fn(),
    };

    answersServiceMock = {
      saveAnswer: jest.fn(),
      batchSaveAnswers: jest.fn(),
    };

    submissionServiceMock = {
      submitAttempt: jest.fn(),
    };

    resultsServiceMock = {
      getAttemptResult: jest.fn(),
      getAttemptHistory: jest.fn(),
      getAttemptReview: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExamAttemptsController],
      providers: [
        {
          provide: ExamAttemptsService,
          useValue: serviceMock,
        },
        {
          provide: ExamAttemptsDeliveryService,
          useValue: deliveryServiceMock,
        },
        {
          provide: ExamAttemptsAnswersService,
          useValue: answersServiceMock,
        },
        {
          provide: ExamAttemptsSubmissionService,
          useValue: submissionServiceMock,
        },
        {
          provide: ExamAttemptsResultsService,
          useValue: resultsServiceMock,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PolicyThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ExamAttemptsController>(ExamAttemptsController);
  });

  describe('startAttempt', () => {
    it('should set status 201 Created when creating new attempt (isResumed: false)', async () => {
      const dto: CreateExamAttemptDto = {
        examId: 'exam-1',
        mode: PartPracticeMode.FULL_EXAM,
      };

      const mockResponse = {
        attemptId: 'att-1',
        examId: 'exam-1',
        examTitle: 'Test Exam',
        status: ExamAttemptStatus.IN_PROGRESS,
        mode: PartPracticeMode.FULL_EXAM,
        totalQuestions: 200,
        startedAt: new Date(),
        expiresAt: new Date(),
        remainingSeconds: 7200,
        serverTimeNow: new Date(),
        isResumed: false,
      };

      serviceMock.startAttempt.mockResolvedValue(mockResponse);

      const req = { ip: '127.0.0.1', headers: {} } as unknown as Request;
      const res = { status: jest.fn() } as unknown as Response;

      const result = await controller.startAttempt(mockUser, dto, req, res);

      expect(result).toEqual(mockResponse);
      expect(res.status).toHaveBeenCalledWith(HttpStatus.CREATED);
    });

    it('should set status 200 OK when resuming existing attempt (isResumed: true - PMR 021)', async () => {
      const dto: CreateExamAttemptDto = {
        examId: 'exam-1',
        mode: PartPracticeMode.FULL_EXAM,
      };

      const mockResponse = {
        attemptId: 'att-1',
        examId: 'exam-1',
        examTitle: 'Test Exam',
        status: ExamAttemptStatus.IN_PROGRESS,
        mode: PartPracticeMode.FULL_EXAM,
        totalQuestions: 200,
        startedAt: new Date(),
        expiresAt: new Date(),
        remainingSeconds: 7200,
        serverTimeNow: new Date(),
        isResumed: true,
      };

      serviceMock.startAttempt.mockResolvedValue(mockResponse);

      const req = { ip: '127.0.0.1', headers: {} } as unknown as Request;
      const res = { status: jest.fn() } as unknown as Response;

      const result = await controller.startAttempt(mockUser, dto, req, res);

      expect(result).toEqual(mockResponse);
      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
    });
  });

  describe('abandonAttempt', () => {
    it('should abandon attempt and return success', async () => {
      const mockResult = {
        success: true,
        message: 'Đã hủy bài thi thành công',
        abandonedAt: new Date(),
      };

      serviceMock.abandonAttempt.mockResolvedValue(mockResult);

      const result = await controller.abandonAttempt(mockUser, 'att-1');
      expect(result).toEqual(mockResult);
      expect(serviceMock.abandonAttempt).toHaveBeenCalledWith('user-uuid-1', 'att-1', false);
    });
  });

  describe('getAttemptOverview', () => {
    it('should return overview for student', async () => {
      const mockOverview = {
        attemptId: 'att-1',
        examId: 'exam-1',
        examTitle: 'Test Exam',
        status: ExamAttemptStatus.IN_PROGRESS,
        totalQuestions: 100,
        answeredCount: 10,
        remainingSeconds: 3600,
        isExpired: false,
        serverTimeNow: new Date(),
        questionsProgress: [],
        parts: [],
      };

      deliveryServiceMock.getAttemptOverview.mockResolvedValue(mockOverview);

      const result = await controller.getAttemptOverview(mockUser, 'att-1');
      expect(result).toEqual(mockOverview);
      expect(deliveryServiceMock.getAttemptOverview).toHaveBeenCalledWith(
        'user-uuid-1',
        'att-1',
        false,
      );
    });

    it('should pass isAdmin=true when requested by admin', async () => {
      const mockOverview = {
        attemptId: 'att-1',
        examId: 'exam-1',
        examTitle: 'Test Exam',
      };

      deliveryServiceMock.getAttemptOverview.mockResolvedValue(mockOverview);

      const result = await controller.getAttemptOverview(mockAdmin, 'att-1');
      expect(result).toEqual(mockOverview);
      expect(deliveryServiceMock.getAttemptOverview).toHaveBeenCalledWith(
        'admin-uuid-1',
        'att-1',
        true,
      );
    });
  });

  describe('getAttemptQuestions', () => {
    it('should return questions delivery response for student', async () => {
      const query: QueryAttemptQuestionsDto = { partNumber: 1 };
      const mockDelivery = {
        attemptId: 'att-1',
        partNumber: 1,
        totalQuestionsInPart: 6,
        questionGroups: [],
        questions: [],
      };

      deliveryServiceMock.getAttemptQuestions.mockResolvedValue(mockDelivery);

      const result = await controller.getAttemptQuestions(mockUser, 'att-1', query);
      expect(result).toEqual(mockDelivery);
      expect(deliveryServiceMock.getAttemptQuestions).toHaveBeenCalledWith(
        'user-uuid-1',
        'att-1',
        query,
        false,
      );
    });

    it('should pass isAdmin=true when requested by admin', async () => {
      const query: QueryAttemptQuestionsDto = { partNumber: 7 };
      const mockDelivery = {
        attemptId: 'att-1',
        partNumber: 7,
      };

      deliveryServiceMock.getAttemptQuestions.mockResolvedValue(mockDelivery);

      const result = await controller.getAttemptQuestions(mockAdmin, 'att-1', query);
      expect(result).toEqual(mockDelivery);
      expect(deliveryServiceMock.getAttemptQuestions).toHaveBeenCalledWith(
        'admin-uuid-1',
        'att-1',
        query,
        true,
      );
    });
  });

  describe('saveAnswer', () => {
    it('should call answersService.saveAnswer with user.id, id, and dto', async () => {
      const dto: SaveAnswerDto = {
        questionId: '20000000-0000-4000-8000-000000000001',
        selectedOptionId: '30000000-0000-4000-8000-000000000001',
        isMarkedForReview: true,
      };

      const mockResponse = {
        success: true,
        questionId: dto.questionId,
        selectedOptionId: dto.selectedOptionId,
        isMarkedForReview: true,
        answeredCount: 15,
        remainingSeconds: 3000,
        savedAt: new Date(),
      };

      answersServiceMock.saveAnswer.mockResolvedValue(mockResponse);

      const result = await controller.saveAnswer(mockUser, 'att-1', dto);

      expect(result).toEqual(mockResponse);
      expect(answersServiceMock.saveAnswer).toHaveBeenCalledWith('user-uuid-1', 'att-1', dto);
    });
  });

  describe('batchSaveAnswers', () => {
    it('should call answersService.batchSaveAnswers with user.id, id, and dto', async () => {
      const dto: BatchSaveAnswersDto = {
        answers: [
          {
            questionId: '20000000-0000-4000-8000-000000000001',
            selectedOptionId: '30000000-0000-4000-8000-000000000001',
          },
        ],
      };

      const mockResponse = {
        success: true,
        syncedCount: 1,
        failedCount: 0,
        failedItems: [],
        answeredCount: 16,
        remainingSeconds: 2990,
        serverTimeNow: new Date(),
      };

      answersServiceMock.batchSaveAnswers.mockResolvedValue(mockResponse);

      const result = await controller.batchSaveAnswers(mockUser, 'att-1', dto);

      expect(result).toEqual(mockResponse);
      expect(answersServiceMock.batchSaveAnswers).toHaveBeenCalledWith('user-uuid-1', 'att-1', dto);
    });
  });

  describe('submitAttempt', () => {
    it('should call submissionService.submitAttempt with user.id and attempt id and return 200 OK result', async () => {
      const mockSubmittedResponse = {
        attemptId: 'att-1',
        status: ExamAttemptStatus.SUBMITTED,
        submittedAt: new Date(),
        durationSpentSeconds: 3500,
        totalScore: 810,
        listeningScore: 420,
        readingScore: 390,
        correctCount: 162,
        wrongCount: 30,
        skippedCount: 8,
        totalQuestions: 200,
        accuracyPercentage: 81,
        isPassed: true,
      };

      submissionServiceMock.submitAttempt.mockResolvedValue(mockSubmittedResponse);

      const result = await controller.submitAttempt(mockUser, 'att-1');

      expect(result).toEqual(mockSubmittedResponse);
      expect(submissionServiceMock.submitAttempt).toHaveBeenCalledWith('user-uuid-1', 'att-1');
    });
  });

  describe('getAttemptHistory (UC27)', () => {
    it('should declare getAttemptHistory BEFORE dynamic :id GET routes on ExamAttemptsController prototype (PMR 027)', () => {
      const methodNames = Object.getOwnPropertyNames(ExamAttemptsController.prototype);
      const historyIdx = methodNames.indexOf('getAttemptHistory');
      const overviewIdx = methodNames.indexOf('getAttemptOverview');
      const questionsIdx = methodNames.indexOf('getAttemptQuestions');

      expect(historyIdx).toBeGreaterThan(-1);
      expect(historyIdx).toBeLessThan(overviewIdx);
      expect(historyIdx).toBeLessThan(questionsIdx);
    });

    it('should call resultsService.getAttemptHistory with user.id and query', async () => {
      const query: QueryAttemptHistoryDto = { page: 1, limit: 10 };
      const mockHistory = {
        items: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      };
      resultsServiceMock.getAttemptHistory.mockResolvedValue(mockHistory);

      const result = await controller.getAttemptHistory(mockUser, query);

      expect(result).toEqual(mockHistory);
      expect(resultsServiceMock.getAttemptHistory).toHaveBeenCalledWith('user-uuid-1', query);
    });
  });

  describe('getAttemptResult (UC26)', () => {
    it('should call resultsService.getAttemptResult with isAdmin=false for student and isAdmin=true for admin', async () => {
      const mockResult = {
        attemptId: 'att-1',
        totalScore: 785,
      };
      resultsServiceMock.getAttemptResult.mockResolvedValue(mockResult);

      const studentRes = await controller.getAttemptResult(mockUser, 'att-1');
      expect(studentRes).toEqual(mockResult);
      expect(resultsServiceMock.getAttemptResult).toHaveBeenCalledWith(
        'user-uuid-1',
        'att-1',
        false,
      );

      const adminRes = await controller.getAttemptResult(mockAdmin, 'att-1');
      expect(adminRes).toEqual(mockResult);
      expect(resultsServiceMock.getAttemptResult).toHaveBeenCalledWith(
        'admin-uuid-1',
        'att-1',
        true,
      );
    });
  });

  describe('getAttemptReview (UC28)', () => {
    it('should call resultsService.getAttemptReview with user.id, id, query, and isAdmin flag', async () => {
      const query: QueryAttemptReviewDto = {
        partNumber: 5,
        filter: AttemptReviewFilter.WRONG,
      };
      const mockReview = {
        attemptId: 'att-1',
        filterCounts: { all: 30, correct: 25, wrong: 5, skipped: 0, marked: 2 },
        questionGroups: [],
        questions: [],
      };
      resultsServiceMock.getAttemptReview.mockResolvedValue(mockReview);

      const studentRes = await controller.getAttemptReview(mockUser, 'att-1', query);
      expect(studentRes).toEqual(mockReview);
      expect(resultsServiceMock.getAttemptReview).toHaveBeenCalledWith(
        'user-uuid-1',
        'att-1',
        query,
        false,
      );

      const adminRes = await controller.getAttemptReview(mockAdmin, 'att-1', query);
      expect(adminRes).toEqual(mockReview);
      expect(resultsServiceMock.getAttemptReview).toHaveBeenCalledWith(
        'admin-uuid-1',
        'att-1',
        query,
        true,
      );
    });
  });
});
