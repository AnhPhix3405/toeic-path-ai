import { Injectable } from '@nestjs/common';
import { DataSource, In, Repository } from 'typeorm';
import { Question } from '../entities/question.entity';
import type { QueryQuestionsDto } from '../dto/request/query-questions.dto';

@Injectable()
export class QuestionRepository extends Repository<Question> {
  constructor(private readonly dataSource: DataSource) {
    super(Question, dataSource.createEntityManager());
  }

  async findPaginated(dto: QueryQuestionsDto): Promise<{ questions: Question[]; total: number }> {
    // PASS 1: Filter, search, and paginate IDs only (no relation selects to avoid oversized query)
    const qb = this.createQueryBuilder('q')
      .select('q.id')
      .orderBy('q.createdAt', 'DESC');

    if (dto.search) {
      const sanitized = dto.search.replace(/[%_\\]/g, '\\$&');
      qb.andWhere('q.content ILIKE :search', { search: `%${sanitized}%` });
    }

    if (dto.partId) {
      qb.andWhere('q.partId = :partId', { partId: dto.partId });
    }

    if (dto.difficulty) {
      qb.andWhere('q.difficulty = :difficulty', { difficulty: dto.difficulty });
    }

    if (dto.status) {
      qb.andWhere('q.status = :status', { status: dto.status });
    }

    if (dto.questionType) {
      qb.andWhere('q.questionType = :questionType', { questionType: dto.questionType });
    }

    if (dto.topicIds && dto.topicIds.length > 0) {
      qb.andWhere(
        'EXISTS (SELECT 1 FROM question_topics qt WHERE qt.question_id = q.id AND qt.topic_id IN (:...topicIds))',
        { topicIds: dto.topicIds },
      );
    }

    if (dto.skillIds && dto.skillIds.length > 0) {
      qb.andWhere(
        'EXISTS (SELECT 1 FROM question_skills qs WHERE qs.question_id = q.id AND qs.skill_id IN (:...skillIds))',
        { skillIds: dto.skillIds },
      );
    }

    const [idResults, total] = await qb
      .skip((dto.page - 1) * dto.limit)
      .take(dto.limit)
      .getManyAndCount();

    if (idResults.length === 0) {
      return { questions: [], total };
    }

    // PASS 2: Fetch full entities and relations for the resolved ID set only
    const ids = idResults.map((item) => item.id);
    const populated = await this.find({
      where: { id: In(ids) },
      relations: { options: true, part: true, topics: true, skills: true },
      order: { createdAt: 'DESC', options: { position: 'ASC' } },
    });

    const idMap = new Map(populated.map((q) => [q.id, q]));
    const questions = ids.map((id) => idMap.get(id)).filter((q): q is Question => q !== undefined);

    return { questions, total };
  }
}
