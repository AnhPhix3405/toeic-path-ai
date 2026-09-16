import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { Question } from './entities/question.entity';
import { QuestionStatus } from './enums/question-status.enum';
import { QuestionType } from './enums/question-type.enum';
import { QuestionsService } from './questions.service';

describe('QuestionsService', () => {
  const repository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOneBy: jest.fn(),
    merge: jest.fn(),
    remove: jest.fn(),
  };
  let service: QuestionsService;
  const question: Question = {
    id: '10000000-0000-4000-8000-000000000001',
    content: 'Where is the meeting being held?',
    questionType: QuestionType.SINGLE_CHOICE,
    status: QuestionStatus.DRAFT,
    createdBy: '20000000-0000-4000-8000-000000000002',
    creator: undefined as never,
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

  it('returns questions newest first without internal ownership data', async () => {
    repository.find.mockResolvedValue([question]);
    const result = await service.findAll();
    expect(repository.find).toHaveBeenCalledWith({ order: { createdAt: 'DESC' } });
    expect(result[0]).not.toHaveProperty('createdBy');
  });

  it('rejects missing questions', async () => {
    repository.findOneBy.mockResolvedValue(null);
    await expect(service.findOne(question.id)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.update(question.id, {}, question.createdBy)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects an empty update for an owned question', async () => {
    repository.findOneBy.mockResolvedValue(question);
    await expect(service.update(question.id, {}, question.createdBy)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('updates and deletes existing questions', async () => {
    repository.findOneBy.mockResolvedValue(question);
    repository.merge.mockReturnValue({ ...question, content: 'Updated' });
    repository.save.mockResolvedValue({ ...question, content: 'Updated' });
    await expect(
      service.update(question.id, { content: 'Updated' }, question.createdBy),
    ).resolves.toMatchObject({ content: 'Updated' });
    await service.remove(question.id, question.createdBy);
    expect(repository.remove).toHaveBeenCalledWith(question);
  });

  it('forbids update and delete by a non-owner regardless of role', async () => {
    repository.findOneBy.mockResolvedValue(question);
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
});
