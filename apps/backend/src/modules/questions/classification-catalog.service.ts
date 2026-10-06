import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type {
  TaxonomyItemResponseDto,
  ToeicPartResponseDto,
} from './dto/response/classification-response.dto';
import { Skill } from './entities/skill.entity';
import { ToeicPart } from './entities/toeic-part.entity';
import { Topic } from './entities/topic.entity';

type CacheEntry<T> = {
  data: T;
  expiresAt: number;
};

const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

@Injectable()
export class ClassificationCatalogService {
  private partsCache: CacheEntry<ToeicPartResponseDto[]> | null = null;
  private topicsCache: CacheEntry<TaxonomyItemResponseDto[]> | null = null;
  private skillsCache: CacheEntry<TaxonomyItemResponseDto[]> | null = null;

  constructor(
    @InjectRepository(ToeicPart)
    private readonly toeicPartsRepository: Repository<ToeicPart>,
    @InjectRepository(Topic)
    private readonly topicsRepository: Repository<Topic>,
    @InjectRepository(Skill)
    private readonly skillsRepository: Repository<Skill>,
  ) {}

  async findToeicParts(): Promise<ToeicPartResponseDto[]> {
    const now = Date.now();
    if (this.partsCache && this.partsCache.expiresAt > now) {
      return this.partsCache.data;
    }

    const parts = await this.toeicPartsRepository.find({ order: { partNumber: 'ASC' } });
    const data = parts.map(({ id, partNumber, name, description }) => ({
      id,
      partNumber,
      name,
      description,
    }));
    this.partsCache = { data, expiresAt: now + DEFAULT_CACHE_TTL_MS };
    return data;
  }

  async findTopics(): Promise<TaxonomyItemResponseDto[]> {
    const now = Date.now();
    if (this.topicsCache && this.topicsCache.expiresAt > now) {
      return this.topicsCache.data;
    }

    const topics = await this.topicsRepository.find({ order: { name: 'ASC' } });
    const data = topics.map(({ id, name, description }) => ({ id, name, description }));
    this.topicsCache = { data, expiresAt: now + DEFAULT_CACHE_TTL_MS };
    return data;
  }

  async findSkills(): Promise<TaxonomyItemResponseDto[]> {
    const now = Date.now();
    if (this.skillsCache && this.skillsCache.expiresAt > now) {
      return this.skillsCache.data;
    }

    const skills = await this.skillsRepository.find({ order: { name: 'ASC' } });
    const data = skills.map(({ id, name, description }) => ({ id, name, description }));
    this.skillsCache = { data, expiresAt: now + DEFAULT_CACHE_TTL_MS };
    return data;
  }

  invalidateCache(): void {
    this.partsCache = null;
    this.topicsCache = null;
    this.skillsCache = null;
  }
}
