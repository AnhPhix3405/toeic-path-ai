import { Test, TestingModule } from '@nestjs/testing';
import { ExamsController } from './exams.controller';
import { ExamsService } from '../services/exams.service';
import { CreateExamDto } from '../dto/request/create-exam.dto';
import { UpdateExamDto } from '../dto/request/update-exam.dto';
import { ExamDetailResponseDto } from '../dto/response/exam-detail-response.dto';
import { ExamType } from '../enums/exam-type.enum';
import { ExamStatus } from '../enums/exam-status.enum';
import { ScoreConversionType } from '../enums/score-conversion-type.enum';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { UserRole } from '../../../common/enums/user-role.enum';
import { UserStatus } from '../../../common/enums/user-status.enum';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PolicyThrottlerGuard } from '../../../common/rate-limit/guards/policy-throttler.guard';

describe('ExamsController', () => {
  let controller: ExamsController;
  let service: jest.Mocked<ExamsService>;

  const mockUser: AuthenticatedUser = {
    id: 'user-uuid-1',
    sessionId: 'sess-1',
    email: 'teacher@test.com',
    role: UserRole.TEACHER,
    status: UserStatus.ACTIVE,
  };

  const mockExamDetail: ExamDetailResponseDto = {
    id: 'exam-uuid-1',
    title: 'ETS 2026 Full Test 01',
    description: 'Test description',
    type: ExamType.FULL_TEST,
    durationMinutes: 120,
    maxAttempts: 3,
    passingScore: 600,
    openAt: null,
    closeAt: null,
    allowPartPractice: true,
    isShuffledQuestions: false,
    isShuffledOptions: false,
    scoreConversionType: ScoreConversionType.DEFAULT_ETS,
    status: ExamStatus.DRAFT,
    publishedAt: null,
    version: 1,
    createdBy: mockUser.id,
    isDeleted: false,
    sectionsCount: 7,
    sections: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockService = {
      create: jest.fn(),
      findManageDetail: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExamsController],
      providers: [
        {
          provide: ExamsService,
          useValue: mockService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PolicyThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ExamsController>(ExamsController);
    service = module.get(ExamsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create()', () => {
    it('should call examsService.create and return response', async () => {
      const dto: CreateExamDto = {
        title: 'ETS 2026 Full Test 01',
        type: ExamType.FULL_TEST,
        durationMinutes: 120,
      };
      service.create.mockResolvedValueOnce(mockExamDetail);

      const result = await controller.create(dto, mockUser);
      expect(service.create).toHaveBeenCalledWith(dto, mockUser);
      expect(result).toEqual(mockExamDetail);
    });
  });

  describe('getManageDetail()', () => {
    it('should call examsService.findManageDetail with id and user', async () => {
      service.findManageDetail.mockResolvedValueOnce(mockExamDetail);

      const result = await controller.getManageDetail('exam-uuid-1', mockUser);
      expect(service.findManageDetail).toHaveBeenCalledWith('exam-uuid-1', mockUser);
      expect(result).toEqual(mockExamDetail);
    });
  });

  describe('update()', () => {
    it('should call examsService.update with id, dto, and user', async () => {
      const dto: UpdateExamDto = {
        title: 'Updated Title',
        version: 1,
      };
      const updatedExam = { ...mockExamDetail, title: 'Updated Title', version: 2 };
      service.update.mockResolvedValueOnce(updatedExam);

      const result = await controller.update('exam-uuid-1', dto, mockUser);
      expect(service.update).toHaveBeenCalledWith('exam-uuid-1', dto, mockUser);
      expect(result).toEqual(updatedExam);
    });
  });

  describe('remove()', () => {
    it('should call examsService.remove with id and user', async () => {
      service.remove.mockResolvedValueOnce({ success: true, message: 'Xóa đề thi thành công.' });

      const result = await controller.remove('exam-uuid-1', mockUser);
      expect(service.remove).toHaveBeenCalledWith('exam-uuid-1', mockUser);
      expect(result).toEqual({ success: true, message: 'Xóa đề thi thành công.' });
    });
  });
});
