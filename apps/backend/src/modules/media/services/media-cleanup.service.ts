import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { STORAGE_SERVICE } from '../../storage/storage.constants';
import type { StorageService } from '../../storage/interfaces/storage-service.interface';
import { MediaResourceRepository } from '../repositories/media-resource.repository';

@Injectable()
export class MediaCleanupService {
  private readonly logger = new Logger(MediaCleanupService.name);
  private isRunning = false;

  private readonly RETENTION_DAYS = 30;
  private readonly BATCH_SIZE = 100;
  private readonly MAX_BATCHES = 50;

  constructor(
    private readonly mediaRepo: MediaResourceRepository,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: StorageService,
  ) {}

  @Cron('0 3 * * *')
  async handleScheduledCleanup(): Promise<void> {
    await this.cleanupSoftDeletedMedia();
  }

  async cleanupSoftDeletedMedia(): Promise<{
    deletedCount: number;
    errorCount: number;
    batchCount: number;
  }> {
    if (this.isRunning) {
      this.logger.warn('Media cleanup skipped: another cleanup cycle is running.');
      return { deletedCount: 0, errorCount: 0, batchCount: 0 };
    }

    this.isRunning = true;
    let totalDeleted = 0;
    let totalErrors = 0;
    let batchCount = 0;

    const cutoffDate = new Date(Date.now() - this.RETENTION_DAYS * 24 * 60 * 60 * 1000);
    this.logger.log(
      `Starting media cleanup for records deleted before ${cutoffDate.toISOString()}`,
    );

    try {
      while (batchCount < this.MAX_BATCHES) {
        const batch = await this.mediaRepo.findSoftDeletedForCleanup(cutoffDate, this.BATCH_SIZE);
        if (batch.length === 0) {
          break;
        }

        batchCount++;
        for (const item of batch) {
          try {
            // Extract storageKey from fileUrl or relative path
            const storageKey = this.extractStorageKey(item.fileUrl);
            await this.storageService.deleteFile(storageKey);
            await this.mediaRepo.delete(item.id);
            totalDeleted++;
          } catch (itemError) {
            totalErrors++;
            this.logger.error(
              `Failed to cleanup media resource ${item.id} (${item.fileUrl}): ${(itemError as Error).message}`,
            );
          }
        }
      }

      this.logger.log(
        `Media cleanup finished: deleted=${totalDeleted}, errors=${totalErrors}, batches=${batchCount}`,
      );
    } finally {
      this.isRunning = false;
    }

    return {
      deletedCount: totalDeleted,
      errorCount: totalErrors,
      batchCount,
    };
  }

  /**
   * Extracts the relative storage key from a public file URL or path.
   * Strips query parameters and decodes URI components safely.
   */
  private extractStorageKey(fileUrl: string): string {
    const cleanUrl = fileUrl.split('?')[0];
    const mediaIndex = cleanUrl.indexOf('/media/');
    if (mediaIndex !== -1) {
      return decodeURIComponent(cleanUrl.substring(mediaIndex + 7));
    }
    return decodeURIComponent(cleanUrl);
  }
}
