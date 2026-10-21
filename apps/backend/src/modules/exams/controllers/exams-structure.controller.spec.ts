import { Test, TestingModule } from '@nestjs/testing';
import { ExamsStructureController } from './exams-structure.controller';
import { ExamsStructureService } from '../services/exams-structure.service';
import { UserRole } from '../../../common/enums/user-role.enum';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PolicyThrottlerGuard } from '../../../common/rate-limit/guards/policy-throttler.guard';
import { ConfigureExamSectionsDto } from '../dto/request/configure-exam-sections.dto';
import { AddExamQuestionsDto } from '../dto/request/add-exam-questions.dto';
import { ReorderExamQuestionsDto } from '../dto/request/reorder-exam-questions.dto';
import { AutoGenerateExamDto } from '../dto/request/auto-generate-exam.dto';

describe('ExamsStructureController', () => {
  let controller: ExamsStructureController;
  let service: jest.Mocked<ExamsStructureService>;

  const mockUser: AuthenticatedUser = {
    id: '10000000-0000-4000-8000-000000000001',
    email: 'teacher@test.com',
    role: UserRole.TEACHER,
  };

  const mockStructureResponse = {
    id: 'exam-01',
    title: 'Test Exam',
    type: 'full_test',
    status: 'draft',
    version: 2,
    totalQuestions: 1,
    sections: [],
    questions: [],
  };

  beforeEach(async () => {
    const mockService = {
      configureSections: jest.fn().mockResolvedValue(mockStructureResponse),
      getStructure: jest.fn().mockResolvedValue(mockStructureResponse),
      addQuestions: jest.fn().mockResolvedValue(mockStructureResponse),
      reorderQuestions: jest.fn().mockResolvedValue(mockStructureResponse),
      removeQuestion: jest.fn().mockResolvedValue(mockStructureResponse),
      autoGenerate: jest.fn().mockResolvedValue(mockStructureResponse),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExamsStructureController],
      providers: [
        {
          provide: ExamsStructureService,
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

    controller = module.get<ExamsStructureController>(ExamsStructureController);
    service = module.get(ExamsStructureService);
  });

  it('should call service.configureSections', async () => {
    const dto: ConfigureExamSectionsDto = {
      version: 1,
      sections: [{ partNumber: 1, targetQuestionsCount: 6 }],
    };
    const res = await controller.configureSections('exam-01', dto, mockUser);

    expect(service.configureSections).toHaveBeenCalledWith('exam-01', dto, mockUser);
    expect(res).toBe(mockStructureResponse);
  });

  it('should call service.getStructure', async () => {
    const res = await controller.getStructure('exam-01', mockUser);

    expect(service.getStructure).toHaveBeenCalledWith('exam-01', mockUser);
    expect(res).toBe(mockStructureResponse);
  });

  it('should call service.addQuestions', async () => {
    const dto: AddExamQuestionsDto = {
      version: 1,
      sectionId: 'sec-01',
      questionIds: ['q-1'],
    };
    const res = await controller.addQuestions('exam-01', dto, mockUser);

    expect(service.addQuestions).toHaveBeenCalledWith('exam-01', dto, mockUser);
    expect(res).toBe(mockStructureResponse);
  });

  it('should call service.reorderQuestions', async () => {
    const dto: ReorderExamQuestionsDto = {
      version: 1,
      items: [{ questionId: 'q-1', orderIndex: 1 }],
    };
    const res = await controller.reorderQuestions('exam-01', dto, mockUser);

    expect(service.reorderQuestions).toHaveBeenCalledWith('exam-01', dto, mockUser);
    expect(res).toBe(mockStructureResponse);
  });

  it('should call service.removeQuestion', async () => {
    const res = await controller.removeQuestion('exam-01', 'q-1', 1, mockUser);

    expect(service.removeQuestion).toHaveBeenCalledWith('exam-01', 'q-1', 1, mockUser);
    expect(res).toBe(mockStructureResponse);
  });

  it('should call service.autoGenerate', async () => {
    const dto: AutoGenerateExamDto = { version: 1 };
    const res = await controller.autoGenerate('exam-01', dto, mockUser);

    expect(service.autoGenerate).toHaveBeenCalledWith('exam-01', dto, mockUser);
    expect(res).toBe(mockStructureResponse);
  });
});
