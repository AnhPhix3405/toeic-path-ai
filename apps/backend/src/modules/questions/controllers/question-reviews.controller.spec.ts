import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '../../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PolicyThrottlerGuard } from '../../../common/rate-limit/guards/policy-throttler.guard';
import { QuestionReviewsController } from './question-reviews.controller';
import { QuestionReviewsService } from '../services/question-reviews.service';
import { QuestionHistoriesService } from '../services/question-histories.service';
import { QuestionStatus } from '../enums/question-status.enum';

describe('QuestionReviewsController', () => {
  let controller: QuestionReviewsController;
  let reviewsService: jest.Mocked<QuestionReviewsService>;
  let historiesService: jest.Mocked<QuestionHistoriesService>;

  beforeEach(async () => {
    reviewsService = {
      getReviewQueue: jest.fn(),
      approveQuestion: jest.fn(),
      requestRevision: jest.fn(),
      rejectQuestion: jest.fn(),
      quickFixApprove: jest.fn(),
      batchApprove: jest.fn(),
      getReviewLogs: jest.fn(),
    } as unknown as jest.Mocked<QuestionReviewsService>;

    historiesService = {
      getHistoriesByQuestionId: jest.fn(),
    } as unknown as jest.Mocked<QuestionHistoriesService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuestionReviewsController],
      providers: [
        { provide: QuestionReviewsService, useValue: reviewsService },
        { provide: QuestionHistoriesService, useValue: historiesService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PolicyThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<QuestionReviewsController>(QuestionReviewsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('GET /queue should return paginated review queue', async () => {
    reviewsService.getReviewQueue.mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 } as any);
    const result = await controller.getReviewQueue({ page: 1, limit: 20 });
    expect(result.total).toBe(0);
    expect(reviewsService.getReviewQueue).toHaveBeenCalledWith({ page: 1, limit: 20 });
  });

  it('POST /:id/approve should call approveQuestion with actor credentials', async () => {
    reviewsService.approveQuestion.mockResolvedValue({
      id: 'q-1',
      status: QuestionStatus.PUBLISHED,
      version: 2,
      updatedAt: new Date(),
    });

    const result = await controller.approveQuestion(
      'q-1',
      { version: 1 },
      { id: 'u-1', role: UserRole.TEACHER },
    );

    expect(result.status).toBe(QuestionStatus.PUBLISHED);
    expect(reviewsService.approveQuestion).toHaveBeenCalledWith(
      'q-1',
      { version: 1 },
      'u-1',
      UserRole.TEACHER,
    );
  });

  it('POST /:id/request-revision should call requestRevision', async () => {
    reviewsService.requestRevision.mockResolvedValue({
      id: 'q-1',
      status: QuestionStatus.REVISION_REQUESTED,
      version: 2,
      feedback: 'Fix typo',
      updatedAt: new Date(),
    });

    const result = await controller.requestRevision(
      'q-1',
      { version: 1, feedback: 'Fix typo' },
      { id: 'u-1', role: UserRole.TEACHER },
    );

    expect(result.status).toBe(QuestionStatus.REVISION_REQUESTED);
    expect(reviewsService.requestRevision).toHaveBeenCalled();
  });

  it('POST /:id/reject should call rejectQuestion', async () => {
    reviewsService.rejectQuestion.mockResolvedValue({
      id: 'q-1',
      status: QuestionStatus.REJECTED,
      version: 2,
      feedback: 'Inaccurate',
      updatedAt: new Date(),
    });

    const result = await controller.rejectQuestion(
      'q-1',
      { version: 1, feedback: 'Inaccurate' },
      { id: 'u-1', role: UserRole.TEACHER },
    );

    expect(result.status).toBe(QuestionStatus.REJECTED);
    expect(reviewsService.rejectQuestion).toHaveBeenCalled();
  });

  it('PUT /:id/quick-fix should call quickFixApprove', async () => {
    reviewsService.quickFixApprove.mockResolvedValue({
      id: 'q-1',
      status: QuestionStatus.PUBLISHED,
      version: 2,
      updatedAt: new Date(),
    });

    const result = await controller.quickFixApprove(
      'q-1',
      { version: 1, content: 'Updated' },
      { id: 'u-1', role: UserRole.TEACHER },
    );

    expect(result.status).toBe(QuestionStatus.PUBLISHED);
    expect(reviewsService.quickFixApprove).toHaveBeenCalled();
  });

  it('POST /batch-approve should call batchApprove', async () => {
    reviewsService.batchApprove.mockResolvedValue({ approvedCount: 2, skipped: [] });

    const result = await controller.batchApprove(
      { items: [{ questionId: 'q-1', version: 1 }] },
      { id: 'u-1', role: UserRole.TEACHER },
    );

    expect(result.approvedCount).toBe(2);
    expect(reviewsService.batchApprove).toHaveBeenCalled();
  });

  it('GET /:id/histories should call historiesService.getHistoriesByQuestionId', async () => {
    historiesService.getHistoriesByQuestionId.mockResolvedValue([]);
    const result = await controller.getHistories('q-1');
    expect(result).toEqual([]);
    expect(historiesService.getHistoriesByQuestionId).toHaveBeenCalledWith('q-1');
  });

  it('GET /:id/logs should call reviewsService.getReviewLogs', async () => {
    reviewsService.getReviewLogs.mockResolvedValue([]);
    const result = await controller.getReviewLogs('q-1');
    expect(result).toEqual([]);
    expect(reviewsService.getReviewLogs).toHaveBeenCalledWith('q-1');
  });
});
