import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type { Repository } from 'typeorm';
import { Question } from './entities/question.entity';
import { QuestionOption } from './entities/question-option.entity';
import { QuestionStatus } from './enums/question-status.enum';
import { QuestionType } from './enums/question-type.enum';
import { QuestionsService } from './questions.service';
import { QuestionGroupsService } from '../question-groups/question-groups.service';
import { QuestionDifficulty } from './enums/question-difficulty.enum';
import { ToeicPart } from './entities/toeic-part.entity';
import { Topic } from './entities/topic.entity';
import { Skill } from './entities/skill.entity';

import { QuestionRepository } from './repositories/question.repository';

describe('QuestionsService', () => {
  const repository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    merge: jest.fn(),
    remove: jest.fn(),
  };
  const questionRepository = { findPaginated: jest.fn() };
  const questionGroupsService = { ensureExists: jest.fn() };
  const questionOptionsRepository = { findOneBy: jest.fn(), remove: jest.fn() };
  const dataSource = { transaction: jest.fn() };
  let service: QuestionsService;
  const question: Question = {
    id: '10000000-0000-4000-8000-000000000001',
    content: 'Where is the meeting being held?',
    questionType: QuestionType.SINGLE_CHOICE,
    status: QuestionStatus.DRAFT,
    createdBy: '20000000-0000-4000-8000-000000000002',
    creator: undefined as never,
    questionGroupId: null,
    questionGroup: null,
    groupOrder: null,
    explanation: null,
    options: [],
    partId: null,
    part: null,
    difficulty: null,
    topics: [],
    skills: [],
    createdAt: new Date('2026-09-15T00:00:00.000Z'),
    updatedAt: new Date('2026-09-15T00:00:00.000Z'),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        QuestionsService,
        {
          provide: getRepositoryToken(Question),
          useValue: repository as Partial<Repository<Question>>,
        },
        { provide: QuestionRepository, useValue: questionRepository },
        { provide: QuestionGroupsService, useValue: questionGroupsService },
        {
          provide: getRepositoryToken(QuestionOption),
          useValue: questionOptionsRepository,
        },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();
    service = module.get(QuestionsService);
    jest.clearAllMocks();
  });

  it('creates a draft question owned by the authenticated teacher', async () => {
    repository.create.mockReturnValue(question);
    repository.save.mockResolvedValue(question);
    const result = await service.create(
      { content: question.content, questionType: QuestionType.SINGLE_CHOICE },
      question.createdBy,
    );
    expect(repository.create).toHaveBeenCalledWith({
      content: question.content,
      questionType: QuestionType.SINGLE_CHOICE,
      createdBy: question.createdBy,
    });
    expect(result).not.toHaveProperty('createdBy');
  });

  it('returns questions newest first with ordered options and without ownership data', async () => {
    const optionAtPositionTwo = {
      id: '50000000-0000-4000-8000-000000000002',
      label: 'B',
      content: 'Second option',
      isCorrect: false,
      position: 2,
    } as QuestionOption;
    const optionAtPositionOne = {
      id: '50000000-0000-4000-8000-000000000001',
      label: 'A',
      content: 'First option',
      isCorrect: true,
      position: 1,
    } as QuestionOption;
    repository.find.mockResolvedValue([
      { ...question, options: [optionAtPositionTwo, optionAtPositionOne] },
    ]);

    const result = await service.findAll();

    expect(repository.find).toHaveBeenCalledWith({
      relations: { options: true, part: true, topics: true, skills: true },
      order: { createdAt: 'DESC', options: { position: 'ASC' } },
    });
    expect(result[0]).not.toHaveProperty('createdBy');
    expect(result[0]?.options.map((option) => option.position)).toEqual([1, 2]);
  });

  it('rejects missing questions', async () => {
    repository.findOne.mockResolvedValue(null);
    await expect(service.findOne(question.id)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.update(question.id, {}, question.createdBy)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects an empty update for an owned question', async () => {
    repository.findOne.mockResolvedValue(question);
    await expect(service.update(question.id, {}, question.createdBy)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('updates and deletes existing questions', async () => {
    repository.findOne.mockResolvedValue(question);
    repository.merge.mockReturnValue({ ...question, content: 'Updated' });
    repository.save.mockResolvedValue({ ...question, content: 'Updated' });
    await expect(
      service.update(question.id, { content: 'Updated' }, question.createdBy),
    ).resolves.toMatchObject({ content: 'Updated' });
    await service.remove(question.id, question.createdBy);
    expect(repository.remove).toHaveBeenCalledWith(question);
  });

  it('forbids update and delete by a non-owner regardless of role', async () => {
    repository.findOne.mockResolvedValue(question);
    const otherUserId = '30000000-0000-4000-8000-000000000003';

    await expect(
      service.update(question.id, { content: 'Not allowed' }, otherUserId),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.remove(question.id, otherUserId)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(repository.save).not.toHaveBeenCalled();
    expect(repository.remove).not.toHaveBeenCalled();
  });

  it('assigns and detaches an owned question group', async () => {
    const questionGroupId = '40000000-0000-4000-8000-000000000004';
    repository.findOne.mockResolvedValue(question);
    repository.findOneBy.mockResolvedValue(null);
    repository.merge.mockReturnValue({ ...question, questionGroupId, groupOrder: 1 });
    repository.save.mockResolvedValue({ ...question, questionGroupId, groupOrder: 1 });

    await expect(
      service.assignGroup(question.id, { questionGroupId, groupOrder: 1 }, question.createdBy),
    ).resolves.toMatchObject({ groupOrder: 1 });
    expect(questionGroupsService.ensureExists).toHaveBeenCalledWith(questionGroupId);

    repository.findOne.mockResolvedValue(question);
    repository.merge.mockReturnValue({ ...question, questionGroupId: null, groupOrder: null });
    repository.save.mockResolvedValue({ ...question, questionGroupId: null, groupOrder: null });
    await expect(service.detachGroup(question.id, question.createdBy)).resolves.toMatchObject({
      groupOrder: null,
    });
  });

  it('creates options and atomically changes the correct answer', async () => {
    const option: QuestionOption = {
      id: '50000000-0000-4000-8000-000000000005',
      questionId: question.id,
      question,
      label: 'B',
      content: 'reviewed',
      isCorrect: true,
      position: 2,
      createdAt: question.createdAt,
      updatedAt: question.updatedAt,
    };
    const manager = {
      update: jest.fn(),
      create: jest.fn().mockReturnValue(option),
      save: jest.fn().mockResolvedValue(option),
    };
    dataSource.transaction.mockImplementation(
      (callback: (transactionManager: typeof manager) => Promise<QuestionOption>) =>
        callback(manager),
    );
    repository.findOne.mockResolvedValue(question);

    await expect(
      service.createOption(
        question.id,
        { content: option.content, position: option.position, isCorrect: true },
        question.createdBy,
      ),
    ).resolves.toMatchObject({ label: 'B', isCorrect: true });
    expect(manager.update).toHaveBeenCalledWith(
      QuestionOption,
      { questionId: question.id },
      { isCorrect: false },
    );

    questionOptionsRepository.findOneBy.mockResolvedValue(option);
    await expect(
      service.setCorrectAnswer(question.id, { optionId: option.id }, question.createdBy),
    ).resolves.toMatchObject({ id: option.id, isCorrect: true });
  });

  it('atomically replaces a complete classification and returns populated relations', async () => {
    const part = {
      id: '40000000-0000-4000-8000-000000000004',
      partNumber: 5,
      name: 'Incomplete Sentences',
      description: null,
    } as ToeicPart;
    const topic = {
      id: '50000000-0000-4000-8000-000000000005',
      name: 'Business',
      description: null,
    } as Topic;
    const skill = {
      id: '60000000-0000-4000-8000-000000000006',
      name: 'Grammar',
      description: null,
    } as Skill;
    const manager = {
      findOne: jest.fn().mockResolvedValue({ ...question, topics: [], skills: [] }),
      findOneBy: jest.fn().mockResolvedValue(part),
      findBy: jest.fn().mockResolvedValueOnce([topic]).mockResolvedValueOnce([skill]),
      save: jest.fn().mockResolvedValue(undefined),
    };
    dataSource.transaction.mockImplementation(
      (callback: (transactionManager: typeof manager) => Promise<void>) => callback(manager),
    );
    repository.findOne.mockResolvedValue({
      ...question,
      partId: part.id,
      part,
      difficulty: QuestionDifficulty.MEDIUM,
      topics: [topic],
      skills: [skill],
    });

    const result = await service.updateClassification(
      question.id,
      {
        partId: part.id,
        topicIds: [topic.id],
        skillIds: [skill.id],
        difficulty: QuestionDifficulty.MEDIUM,
      },
      question.createdBy,
    );

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(manager.save).toHaveBeenCalledWith(
      Question,
      expect.objectContaining({
        partId: part.id,
        difficulty: QuestionDifficulty.MEDIUM,
        topics: [topic],
        skills: [skill],
      }),
    );
    expect(result).toMatchObject({
      part: { partNumber: 5 },
      difficulty: QuestionDifficulty.MEDIUM,
      topics: [{ name: 'Business' }],
      skills: [{ name: 'Grammar' }],
    });
  });

  it('rejects an unknown classification reference before writing', async () => {
    const manager = {
      findOne: jest.fn().mockResolvedValue({ ...question, topics: [], skills: [] }),
      findOneBy: jest.fn().mockResolvedValue({ id: '40000000-0000-4000-8000-000000000004' }),
      findBy: jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([]),
      save: jest.fn(),
    };
    dataSource.transaction.mockImplementation(
      (callback: (transactionManager: typeof manager) => Promise<void>) => callback(manager),
    );

    await expect(
      service.updateClassification(
        question.id,
        {
          partId: '40000000-0000-4000-8000-000000000004',
          topicIds: ['50000000-0000-4000-8000-000000000005'],
          skillIds: ['60000000-0000-4000-8000-000000000006'],
          difficulty: QuestionDifficulty.HARD,
        },
        question.createdBy,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('forbids classification changes by a non-owner before reading catalogs', async () => {
    const manager = {
      findOne: jest.fn().mockResolvedValue(question),
      findOneBy: jest.fn(),
      findBy: jest.fn(),
      save: jest.fn(),
    };
    dataSource.transaction.mockImplementation(
      (callback: (transactionManager: typeof manager) => Promise<void>) => callback(manager),
    );

    await expect(
      service.updateClassification(
        question.id,
        {
          partId: '40000000-0000-4000-8000-000000000004',
          topicIds: [],
          skillIds: [],
          difficulty: QuestionDifficulty.EASY,
        },
        '30000000-0000-4000-8000-000000000003',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(manager.findOneBy).not.toHaveBeenCalled();
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('delegates findPaginated to QuestionRepository and calculates pagination metadata', async () => {
    questionRepository.findPaginated.mockResolvedValue({
      questions: [question],
      total: 42,
    });

    const result = await service.findPaginated({
      page: 2,
      limit: 10,
      search: 'meeting',
    });

    expect(questionRepository.findPaginated).toHaveBeenCalledWith({
      page: 2,
      limit: 10,
      search: 'meeting',
    });
    expect(result).toEqual({
      data: [expect.objectContaining({ id: question.id, content: question.content })],
      total: 42,
      page: 2,
      limit: 10,
      totalPages: 5,
    });
  });

  it('returns totalPages as 0 when total is 0 or result is empty', async () => {
    questionRepository.findPaginated.mockResolvedValue({
      questions: [],
      total: 0,
    });

    const result = await service.findPaginated({
      page: 1,
      limit: 20,
    });

    expect(result).toEqual({
      data: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    });
  });
});
