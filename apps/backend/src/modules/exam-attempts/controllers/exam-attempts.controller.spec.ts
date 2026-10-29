import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ExamAttemptsController } from './exam-attempts.controller';
import { ExamAttemptsService } from '../services/exam-attempts.service';
import { CreateExamAttemptDto } from '../dto/request/create-exam-attempt.dto';
import { PartPracticeMode } from '../enums/part-practice-mode.enum';
import { ExamAttemptStatus } from '../enums/exam-attempt-status.enum';
import { UserRole } from '../../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PolicyThrottlerGuard } from '../../../common/rate-limit/guards/policy-throttler.guard';

describe('ExamAttemptsController', () => {
  let controller: ExamAttemptsController;
  let serviceMock: any;

  const mockUser = {
    id: 'user-uuid-1',
    email: 'student@example.com',
    role: UserRole.STUDENT,
  };

  beforeEach(async () => {
    serviceMock = {
      startAttempt: jest.fn(),
      abandonAttempt: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExamAttemptsController],
      providers: [
        {
          provide: ExamAttemptsService,
          useValue: serviceMock,
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

      const req: any = { ip: '127.0.0.1', headers: {} };
      const res: any = { status: jest.fn() };

      const result = await controller.startAttempt(mockUser as any, dto, req, res);

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

      const req: any = { ip: '127.0.0.1', headers: {} };
      const res: any = { status: jest.fn() };

      const result = await controller.startAttempt(mockUser as any, dto, req, res);

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

      const result = await controller.abandonAttempt(mockUser as any, 'att-1');
      expect(result).toEqual(mockResult);
      expect(serviceMock.abandonAttempt).toHaveBeenCalledWith('user-uuid-1', 'att-1', false);
    });
  });
});
