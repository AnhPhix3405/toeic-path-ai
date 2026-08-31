import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { DataSource, type QueryResult, type QueryRunner } from 'typeorm';

const CLEANUP_LOCK_NAME = 'toeic-path-auth-session-cleanup';
const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;
const CLEANUP_JOB_NAME = 'auth-session-cleanup';

interface AdvisoryLockRow {
  acquired: boolean;
}

interface DeletedSessionRow {
  id: string;
}

export interface CleanupResult {
  deletedCount: number;
  batchCount: number;
  startedAt: Date;
  finishedAt: Date;
}

@Injectable()
export class AuthSessionCleanupService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(AuthSessionCleanupService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  onApplicationBootstrap(): void {
    const cronExpression = this.configService.getOrThrow<string>('authSessionCleanup.cron');
    const job = new CronJob(cronExpression, () => {
      void this.handleScheduledCleanup();
    });
    this.schedulerRegistry.addCronJob(CLEANUP_JOB_NAME, job);
    job.start();
  }

  onApplicationShutdown(): void {
    if (!this.schedulerRegistry.doesExist('cron', CLEANUP_JOB_NAME)) return;
    this.schedulerRegistry.deleteCronJob(CLEANUP_JOB_NAME);
  }

  async cleanupExpiredAndRevokedSessions(): Promise<CleanupResult> {
    const startedAt = new Date();
    const retentionDays = this.configService.getOrThrow<number>('authSessionCleanup.retentionDays');
    const batchSize = this.configService.getOrThrow<number>('authSessionCleanup.batchSize');
    const maxBatches = this.configService.getOrThrow<number>('authSessionCleanup.maxBatches');
    const cutoff = new Date(Date.now() - retentionDays * DAY_IN_MILLISECONDS);
    const queryRunner = this.dataSource.createQueryRunner();
    let lockAcquired = false;
    let deletedCount = 0;
    let batchCount = 0;

    await queryRunner.connect();
    try {
      lockAcquired = await this.tryAcquireLock(queryRunner);
      if (!lockAcquired) {
        this.logger.log('Auth session cleanup skipped: another instance is running');
        return { deletedCount, batchCount, startedAt, finishedAt: new Date() };
      }

      while (batchCount < maxBatches) {
        const deletedInBatch = await this.deleteBatch(queryRunner, cutoff, batchSize);
        deletedCount += deletedInBatch;
        batchCount += 1;
        if (deletedInBatch < batchSize) break;
      }

      const finishedAt = new Date();
      this.logger.log(
        `Auth session cleanup completed: deletedCount=${deletedCount} batchCount=${batchCount} ` +
          `durationMs=${finishedAt.getTime() - startedAt.getTime()} cutoff=${cutoff.toISOString()}`,
      );
      return { deletedCount, batchCount, startedAt, finishedAt };
    } finally {
      if (lockAcquired) await this.releaseLock(queryRunner);
      await queryRunner.release();
    }
  }

  async deleteCleanupBatch(cutoff: Date, batchSize: number): Promise<number> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      return await this.deleteBatch(queryRunner, cutoff, batchSize);
    } finally {
      await queryRunner.release();
    }
  }

  async handleScheduledCleanup(): Promise<void> {
    if (!this.configService.getOrThrow<boolean>('authSessionCleanup.enabled')) return;

    try {
      await this.cleanupExpiredAndRevokedSessions();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown cleanup error';
      this.logger.error('Auth session cleanup failed', message);
    }
  }

  private async deleteBatch(
    queryRunner: QueryRunner,
    cutoff: Date,
    batchSize: number,
  ): Promise<number> {
    const result = (await queryRunner.query(
      `WITH cleanup_candidates AS (
        SELECT id
        FROM auth_sessions
        WHERE (revoked_at IS NOT NULL AND revoked_at < $1)
           OR expires_at < $1
        ORDER BY created_at ASC
        LIMIT $2
        FOR UPDATE SKIP LOCKED
      )
      DELETE FROM auth_sessions AS session
      USING cleanup_candidates AS candidate
      WHERE session.id = candidate.id
      RETURNING session.id`,
      [cutoff, batchSize],
      true,
    )) as unknown as QueryResult<DeletedSessionRow>;
    return result.records.length;
  }

  private async tryAcquireLock(queryRunner: QueryRunner): Promise<boolean> {
    const result = (await queryRunner.query(
      'SELECT pg_try_advisory_lock(hashtext($1)) AS acquired',
      [CLEANUP_LOCK_NAME],
      true,
    )) as unknown as QueryResult<AdvisoryLockRow>;
    return result.records[0]?.acquired === true;
  }

  private async releaseLock(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('SELECT pg_advisory_unlock(hashtext($1))', [CLEANUP_LOCK_NAME]);
  }
}
