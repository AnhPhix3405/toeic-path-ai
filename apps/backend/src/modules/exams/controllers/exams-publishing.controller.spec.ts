import { Test, TestingModule } from '@nestjs/testing';
import { ExamsPublishingController } from './exams-publishing.controller';
import { ExamsPublishingService } from '../services/exams-publishing.service';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { UserRole } from '../../../common/enums/user-role.enum';
import { ExamStatus } from '../enums/exam-status.enum';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PolicyThrottlerGuard } from '../../../common/rate-limit/guards/policy-throttler.guard';

describe('ExamsPublishingController', () => {
  let controller: ExamsPublishingController;
  let service: {
    publish: jest.Mock;
    unpublish: jest.Mock;
    close: jest.Mock;
    archive: jest.Mock;
  };

  const mockUser: AuthenticatedUser = {
    id: 'user-1',
    email: 'teacher@example.com',
    role: UserRole.TEACHER,
  };

  const mockResult = {
    id: 'exam-1',
    title: 'Test Exam',
    status: ExamStatus.PUBLISHED,
    version: 2,
    isScheduled: false,
    openAt: null,
    closeAt: null,
    publishedAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    service = {
      publish: jest.fn().mockResolvedValue(mockResult),
      unpublish: jest.fn().mockResolvedValue({ ...mockResult, status: ExamStatus.DRAFT }),
      close: jest.fn().mockResolvedValue({ ...mockResult, status: ExamStatus.CLOSED }),
      archive: jest.fn().mockResolvedValue({ ...mockResult, status: ExamStatus.ARCHIVED }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExamsPublishingController],
      providers: [{ provide: ExamsPublishingService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PolicyThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ExamsPublishingController>(ExamsPublishingController);
  });

  it('publish should delegate to service.publish', async () => {
    const res = await controller.publish('exam-1', { version: 1 }, mockUser);
    expect(service.publish).toHaveBeenCalledWith('exam-1', { version: 1 }, mockUser);
    expect(res.status).toBe(ExamStatus.PUBLISHED);
  });

  it('unpublish should delegate to service.unpublish', async () => {
    const res = await controller.unpublish('exam-1', { version: 2 }, mockUser);
    expect(service.unpublish).toHaveBeenCalledWith('exam-1', { version: 2 }, mockUser);
    expect(res.status).toBe(ExamStatus.DRAFT);
  });

  it('close should delegate to service.close', async () => {
    const res = await controller.close('exam-1', { version: 2 }, mockUser);
    expect(service.close).toHaveBeenCalledWith('exam-1', { version: 2 }, mockUser);
    expect(res.status).toBe(ExamStatus.CLOSED);
  });

  it('archive should delegate to service.archive', async () => {
    const res = await controller.archive('exam-1', { version: 3 }, mockUser);
    expect(service.archive).toHaveBeenCalledWith('exam-1', { version: 3 }, mockUser);
    expect(res.status).toBe(ExamStatus.ARCHIVED);
  });
});
