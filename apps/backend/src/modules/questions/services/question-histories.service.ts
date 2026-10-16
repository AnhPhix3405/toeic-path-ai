import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { QuestionHistory } from '../entities/question-history.entity';
import { QuestionHistoryChangeType } from '../enums/question-history-change-type.enum';

@Injectable()
export class QuestionHistoriesService {
  constructor(
    @InjectRepository(QuestionHistory)
    private readonly historyRepo: Repository<QuestionHistory>,
  ) {}

  async createSnapshot(
    questionId: string,
    changedBy: string,
    changeType: QuestionHistoryChangeType,
    snapshotBefore: Record<string, unknown> | null,
    snapshotAfter: Record<string, unknown>,
    comment?: string,
    manager?: EntityManager,
  ): Promise<QuestionHistory> {
    const data = {
      questionId,
      changedBy,
      changeType,
      snapshotBefore,
      snapshotAfter,
      comment: comment ?? null,
    };

    if (manager) {
      const entity = manager.create(QuestionHistory, data);
      return manager.save(QuestionHistory, entity);
    }

    const entity = this.historyRepo.create(data);
    return this.historyRepo.save(entity);
  }

  async getHistoriesByQuestionId(questionId: string): Promise<QuestionHistory[]> {
    return this.historyRepo.find({
      where: { questionId },
      order: { createdAt: 'DESC' },
    });
  }
}
