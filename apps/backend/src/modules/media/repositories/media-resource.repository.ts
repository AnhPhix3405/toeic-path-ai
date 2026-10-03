import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { MediaResource } from '../../questions/entities/media-resource.entity';

@Injectable()
export class MediaResourceRepository extends Repository<MediaResource> {
  constructor(dataSource: DataSource) {
    super(MediaResource, dataSource.createEntityManager());
  }

  async findActiveById(id: string): Promise<MediaResource | null> {
    return this.findOne({
      where: { id, isDeleted: false },
    });
  }

  async findActiveByQuestionId(questionId: string): Promise<MediaResource[]> {
    return this.find({
      where: { questionId, isDeleted: false },
      order: { createdAt: 'ASC' },
    });
  }

  async findActiveByQuestionGroupId(questionGroupId: string): Promise<MediaResource[]> {
    return this.find({
      where: { questionGroupId, isDeleted: false },
      order: { createdAt: 'ASC' },
    });
  }

  async findSoftDeletedForCleanup(cutoffDate: Date, limit: number): Promise<MediaResource[]> {
    return this.createQueryBuilder('media')
      .where('media.is_deleted = :isDeleted', { isDeleted: true })
      .andWhere('media.deleted_at < :cutoffDate', { cutoffDate })
      .orderBy('media.deleted_at', 'ASC')
      .take(limit)
      .getMany();
  }

  async markAsDeleted(id: string): Promise<void> {
    await this.update(id, {
      isDeleted: true,
      deletedAt: new Date(),
    });
  }
}
