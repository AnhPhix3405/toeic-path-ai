import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ClassificationCatalogService } from './classification-catalog.service';
import { Skill } from './entities/skill.entity';
import { ToeicPart } from './entities/toeic-part.entity';
import { Topic } from './entities/topic.entity';

describe('ClassificationCatalogService', () => {
  const toeicPartsRepository = { find: jest.fn() };
  const topicsRepository = { find: jest.fn() };
  const skillsRepository = { find: jest.fn() };
  let service: ClassificationCatalogService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ClassificationCatalogService,
        { provide: getRepositoryToken(ToeicPart), useValue: toeicPartsRepository },
        { provide: getRepositoryToken(Topic), useValue: topicsRepository },
        { provide: getRepositoryToken(Skill), useValue: skillsRepository },
      ],
    }).compile();
    service = module.get(ClassificationCatalogService);
    jest.clearAllMocks();
  });

  it('returns ordered catalogs without exposing stable internal codes', async () => {
    toeicPartsRepository.find.mockResolvedValue([
      { id: 'part-id', partNumber: 1, name: 'Photographs', description: null },
    ]);
    topicsRepository.find.mockResolvedValue([
      { id: 'topic-id', code: 'business', name: 'Business', description: null },
    ]);
    skillsRepository.find.mockResolvedValue([
      { id: 'skill-id', code: 'grammar', name: 'Grammar', description: null },
    ]);

    await expect(service.findToeicParts()).resolves.toEqual([
      { id: 'part-id', partNumber: 1, name: 'Photographs', description: null },
    ]);
    await expect(service.findTopics()).resolves.toEqual([
      { id: 'topic-id', name: 'Business', description: null },
    ]);
    await expect(service.findSkills()).resolves.toEqual([
      { id: 'skill-id', name: 'Grammar', description: null },
    ]);
    expect(toeicPartsRepository.find).toHaveBeenCalledWith({ order: { partNumber: 'ASC' } });
    expect(topicsRepository.find).toHaveBeenCalledWith({ order: { name: 'ASC' } });
    expect(skillsRepository.find).toHaveBeenCalledWith({ order: { name: 'ASC' } });
  });
});
