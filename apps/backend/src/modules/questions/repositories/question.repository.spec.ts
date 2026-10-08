import { DataSource, In } from 'typeorm';
import { QuestionRepository } from './question.repository';
import { Question } from '../entities/question.entity';
import { QuestionDifficulty } from '../enums/question-difficulty.enum';
import { QuestionStatus } from '../enums/question-status.enum';
import { QuestionType } from '../enums/question-type.enum';

describe('QuestionRepository', () => {
  let repository: QuestionRepository;
  let qb: {
    select: jest.Mock;
    orderBy: jest.Mock;
    andWhere: jest.Mock;
    skip: jest.Mock;
    take: jest.Mock;
    getManyAndCount: jest.Mock;
  };
  let dataSource: {
    createEntityManager: jest.Mock;
  };

  beforeEach(() => {
    qb = {
      select: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
    };

    dataSource = {
      createEntityManager: jest.fn().mockReturnValue({}),
    };

    repository = new QuestionRepository(dataSource as unknown as DataSource);
    jest.spyOn(repository, 'createQueryBuilder').mockReturnValue(qb as never);
    jest.spyOn(repository, 'find').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('performs Pass 1 ID query and Pass 2 relations query in order', async () => {
    const id1 = '10000000-0000-4000-8000-000000000001';
    const id2 = '10000000-0000-4000-8000-000000000002';
    qb.getManyAndCount.mockResolvedValue([[{ id: id1 }, { id: id2 }], 2]);

    const q1 = { id: id1, content: 'Question 1', createdAt: new Date('2026-01-02') } as Question;
    const q2 = { id: id2, content: 'Question 2', createdAt: new Date('2026-01-01') } as Question;

    // Simulate DB returning results in different order in Pass 2
    jest.spyOn(repository, 'find').mockResolvedValue([q2, q1]);

    const result = await repository.findPaginated({
      page: 1,
      limit: 20,
    });

    expect(qb.select).toHaveBeenCalledWith('q.id');
    expect(qb.orderBy).toHaveBeenCalledWith('q.createdAt', 'DESC');
    expect(qb.skip).toHaveBeenCalledWith(0);
    expect(qb.take).toHaveBeenCalledWith(20);

    expect(repository.find).toHaveBeenCalledWith({
      where: { id: In([id1, id2]) },
      relations: { options: true, part: true, topics: true, skills: true },
      order: { createdAt: 'DESC', options: { position: 'ASC' } },
    });

    // Result should strictly preserve Pass 1 order [q1, q2]
    expect(result.questions).toEqual([q1, q2]);
    expect(result.total).toBe(2);
  });

  it('escapes search wildcards (% and _) in Pass 1', async () => {
    qb.getManyAndCount.mockResolvedValue([[], 0]);

    await repository.findPaginated({
      search: 'discount 50% on item_price',
      page: 1,
      limit: 20,
    });

    expect(qb.andWhere).toHaveBeenCalledWith('q.content ILIKE :search', {
      search: '%discount 50\\% on item\\_price%',
    });
    expect(repository.find).not.toHaveBeenCalled();
  });

  it('applies partId, difficulty, status, and questionType filters', async () => {
    qb.getManyAndCount.mockResolvedValue([[], 0]);

    const partId = '40000000-0000-4000-8000-000000000004';
    await repository.findPaginated({
      partId,
      difficulty: QuestionDifficulty.HARD,
      status: QuestionStatus.DRAFT,
      questionType: QuestionType.SINGLE_CHOICE,
      page: 2,
      limit: 10,
    });

    expect(qb.andWhere).toHaveBeenCalledWith('q.partId = :partId', { partId });
    expect(qb.andWhere).toHaveBeenCalledWith('q.difficulty = :difficulty', {
      difficulty: QuestionDifficulty.HARD,
    });
    expect(qb.andWhere).toHaveBeenCalledWith('q.status = :status', {
      status: QuestionStatus.DRAFT,
    });
    expect(qb.andWhere).toHaveBeenCalledWith('q.questionType = :questionType', {
      questionType: QuestionType.SINGLE_CHOICE,
    });
    expect(qb.skip).toHaveBeenCalledWith(10);
    expect(qb.take).toHaveBeenCalledWith(10);
  });

  it('applies EXISTS subqueries for topicIds and skillIds (OR logic)', async () => {
    qb.getManyAndCount.mockResolvedValue([[], 0]);

    const topicIds = [
      '50000000-0000-4000-8000-000000000001',
      '50000000-0000-4000-8000-000000000002',
    ];
    const skillIds = ['60000000-0000-4000-8000-000000000001'];

    await repository.findPaginated({
      topicIds,
      skillIds,
      page: 1,
      limit: 20,
    });

    expect(qb.andWhere).toHaveBeenCalledWith(
      'EXISTS (SELECT 1 FROM question_topics qt WHERE qt.question_id = q.id AND qt.topic_id IN (:...topicIds))',
      { topicIds },
    );
    expect(qb.andWhere).toHaveBeenCalledWith(
      'EXISTS (SELECT 1 FROM question_skills qs WHERE qs.question_id = q.id AND qs.skill_id IN (:...skillIds))',
      { skillIds },
    );
  });

  it('returns empty array when Pass 1 yields no results without executing Pass 2', async () => {
    qb.getManyAndCount.mockResolvedValue([[], 0]);

    const result = await repository.findPaginated({ page: 1, limit: 20 });

    expect(result).toEqual({ questions: [], total: 0 });
    expect(repository.find).not.toHaveBeenCalled();
  });
});
