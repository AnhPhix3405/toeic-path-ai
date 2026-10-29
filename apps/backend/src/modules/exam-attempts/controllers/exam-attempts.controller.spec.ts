import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Request, Response } from 'express';
import { ExamAttemptsController } from './exam-attempts.controller';
import { ExamAttemptsService } from '../services/exam-attempts.service';
import { ExamAttemptsDeliveryService } from '../services/exam-attempts-delivery.service';
import { ExamAttemptsAnswersService } from '../services/exam-attempts-answers.service';
import { CreateExamAttemptDto } from '../dto/request/create-exam-attempt.dto';
import { QueryAttemptQuestionsDto } from '../dto/request/query-attempt-questions.dto';
import { SaveAnswerDto } from '../dto/request/save-answer.dto';
import { BatchSaveAnswersDto } from '../dto/request/batch-save-answers.dto';
import { PartPracticeMode } from '../enums/part-practice-mode.enum';
import { ExamAttemptStatus } from '../enums/exam-attempt-status.enum';
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
});
