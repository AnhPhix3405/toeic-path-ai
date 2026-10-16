import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuestionHistory } from '../entities/question-history.entity';
import { QuestionHistoryChangeType } from '../enums/question-history-change-type.enum';
import { QuestionHistoriesService } from './question-histories.service';

describe('QuestionHistoriesService', () => {
  let service: QuestionHistoriesService;
  let repo: jest.Mocked<Repository<QuestionHistory>>;

  beforeEach(async () => {
    const mockRepo = {
      create: jest.fn().mockImplementation((data) => data),
      save: jest.fn().mockImplementation(async (data) => ({
        id: 'h-1',
        createdAt: new Date(),
        ...data,
      })),
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuestionHistoriesService,
        {
          provide: getRepositoryToken(QuestionHistory),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<QuestionHistoriesService>(QuestionHistoriesService);
    repo = module.get(getRepositoryToken(QuestionHistory));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should save question snapshot with snapshotBefore and snapshotAfter', async () => {
    const result = await service.createSnapshot(
      'q-1',
      'u-1',
      QuestionHistoryChangeType.QUICK_FIXED,
      { content: 'Old content' },
      { content: 'New content' },
      'Fixed typo in option',
    );

    expect(result.questionId).toBe('q-1');
    expect(result.changedBy).toBe('u-1');
    expect(result.changeType).toBe(QuestionHistoryChangeType.QUICK_FIXED);
    expect(result.snapshotBefore).toEqual({ content: 'Old content' });
    expect(result.snapshotAfter).toEqual({ content: 'New content' });
    expect(result.comment).toBe('Fixed typo in option');
    expect(repo.save).toHaveBeenCalled();
  });

  it('should retrieve history records ordered by createdAt DESC', async () => {
    const mockList = [
      { id: 'h-2', questionId: 'q-1', createdAt: new Date() },
      { id: 'h-1', questionId: 'q-1', createdAt: new Date(Date.now() - 1000) },
    ] as QuestionHistory[];
    repo.find.mockResolvedValue(mockList);

    const list = await service.getHistoriesByQuestionId('q-1');
    expect(list).toEqual(mockList);
    expect(repo.find).toHaveBeenCalledWith({
      where: { questionId: 'q-1' },
      order: { createdAt: 'DESC' },
    });
  });
});
