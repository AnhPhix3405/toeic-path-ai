import { ConfigService } from '@nestjs/config';
import type { SchedulerRegistry } from '@nestjs/schedule';
import type { DataSource, QueryResult, QueryRunner } from 'typeorm';
import { AuthSessionCleanupService } from './auth-session-cleanup.service';

describe('AuthSessionCleanupService', () => {
  let query: jest.Mock;
  let queryRunner: jest.Mocked<Pick<QueryRunner, 'connect' | 'query' | 'release'>>;
  let service: AuthSessionCleanupService;
  const schedulerRegistry = {
    addCronJob: jest.fn(),
    doesExist: jest.fn(() => false),
    deleteCronJob: jest.fn(),
  } as unknown as SchedulerRegistry;

  const result = <T>(records: T[]): QueryResult<T> => ({ raw: records, records });

  beforeEach(() => {
    query = jest.fn();
    queryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      query,
      release: jest.fn().mockResolvedValue(undefined),
    };
    const dataSource = {
      createQueryRunner: jest.fn(() => queryRunner as unknown as QueryRunner),
    } as unknown as DataSource;
    const values: Record<string, unknown> = {
      'authSessionCleanup.enabled': true,
      'authSessionCleanup.retentionDays': 7,
      'authSessionCleanup.batchSize': 2,
      'authSessionCleanup.maxBatches': 3,
      'authSessionCleanup.cron': '0 0 2 * * *',
    };
    const configService = {
      getOrThrow: jest.fn((key: string) => values[key]),
    } as unknown as ConfigService;
    service = new AuthSessionCleanupService(dataSource, configService, schedulerRegistry);
  });

  it('uses parameterized cutoff and batch size in the cleanup predicate', async () => {
    query.mockResolvedValue(result([{ id: 'session-id' }]));
    const cutoff = new Date('2026-08-01T00:00:00.000Z');

    await expect(service.deleteCleanupBatch(cutoff, 1000)).resolves.toBe(1);

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('revoked_at < $1'),
      [cutoff, 1000],
      true,
    );
    const firstQuery = query.mock.calls[0] as unknown as [string];
    expect(firstQuery[0]).toContain('expires_at < $1');
    expect(firstQuery[0]).toContain('FOR UPDATE SKIP LOCKED');
    expect(queryRunner.release).toHaveBeenCalled();
  });

  it('continues full batches and stops on a partial batch', async () => {
    query
      .mockResolvedValueOnce(result([{ acquired: true }]))
      .mockResolvedValueOnce(result([{ id: '1' }, { id: '2' }]))
      .mockResolvedValueOnce(result([{ id: '3' }]))
      .mockResolvedValueOnce(result([{ unlocked: true }]));

    const cleanupResult = await service.cleanupExpiredAndRevokedSessions();

    expect(cleanupResult).toMatchObject({ deletedCount: 3, batchCount: 2 });
    expect(query).toHaveBeenLastCalledWith('SELECT pg_advisory_unlock(hashtext($1))', [
      'toeic-path-auth-session-cleanup',
    ]);
    expect(queryRunner.release).toHaveBeenCalled();
  });

  it('stops at the configured maximum number of batches', async () => {
    query
      .mockResolvedValueOnce(result([{ acquired: true }]))
      .mockResolvedValueOnce(result([{ id: '1' }, { id: '2' }]))
      .mockResolvedValueOnce(result([{ id: '3' }, { id: '4' }]))
      .mockResolvedValueOnce(result([{ id: '5' }, { id: '6' }]))
      .mockResolvedValueOnce(result([{ unlocked: true }]));

    await expect(service.cleanupExpiredAndRevokedSessions()).resolves.toMatchObject({
      deletedCount: 6,
      batchCount: 3,
    });
  });

  it('skips deletion when another instance holds the lock', async () => {
    query.mockResolvedValueOnce(result([{ acquired: false }]));

    await expect(service.cleanupExpiredAndRevokedSessions()).resolves.toMatchObject({
      deletedCount: 0,
      batchCount: 0,
    });
    expect(query).toHaveBeenCalledTimes(1);
    expect(queryRunner.release).toHaveBeenCalled();
  });

  it('releases the lock when deletion fails', async () => {
    query
      .mockResolvedValueOnce(result([{ acquired: true }]))
      .mockRejectedValueOnce(new Error('database error'))
      .mockResolvedValueOnce(result([{ unlocked: true }]));

    await expect(service.cleanupExpiredAndRevokedSessions()).rejects.toThrow('database error');
    expect(query).toHaveBeenLastCalledWith('SELECT pg_advisory_unlock(hashtext($1))', [
      'toeic-path-auth-session-cleanup',
    ]);
    expect(queryRunner.release).toHaveBeenCalled();
  });

  it('does not run scheduled cleanup when disabled', async () => {
    const disabledConfig = {
      getOrThrow: jest.fn(() => false),
    } as unknown as ConfigService;
    const cleanup = new AuthSessionCleanupService(
      {} as DataSource,
      disabledConfig,
      schedulerRegistry,
    );
    const cleanupSpy = jest.spyOn(cleanup, 'cleanupExpiredAndRevokedSessions');

    await cleanup.handleScheduledCleanup();

    expect(cleanupSpy).not.toHaveBeenCalled();
  });

  it('swallows scheduled cleanup failures', async () => {
    jest.spyOn(service, 'cleanupExpiredAndRevokedSessions').mockRejectedValue(new Error('failure'));

    await expect(service.handleScheduledCleanup()).resolves.toBeUndefined();
  });
});
