import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type {
  TaxonomyItemResponseDto,
  ToeicPartResponseDto,
} from './dto/classification-response.dto';
import { Skill } from './entities/skill.entity';
import { ToeicPart } from './entities/toeic-part.entity';
import { Topic } from './entities/topic.entity';

@Injectable()
export class ClassificationCatalogService {
  constructor(
    @InjectRepository(ToeicPart)
    private readonly toeicPartsRepository: Repository<ToeicPart>,
    @InjectRepository(Topic)
    private readonly topicsRepository: Repository<Topic>,
    @InjectRepository(Skill)
    private readonly skillsRepository: Repository<Skill>,
  ) {}

  async findToeicParts(): Promise<ToeicPartResponseDto[]> {
    const parts = await this.toeicPartsRepository.find({ order: { partNumber: 'ASC' } });
    return parts.map(({ id, partNumber, name, description }) => ({
      id,
      partNumber,
      name,
      description,
    }));
  }

  async findTopics(): Promise<TaxonomyItemResponseDto[]> {
    const topics = await this.topicsRepository.find({ order: { name: 'ASC' } });
    return topics.map(({ id, name, description }) => ({ id, name, description }));
  }

  async findSkills(): Promise<TaxonomyItemResponseDto[]> {
    const skills = await this.skillsRepository.find({ order: { name: 'ASC' } });
    return skills.map(({ id, name, description }) => ({ id, name, description }));
  }
}
