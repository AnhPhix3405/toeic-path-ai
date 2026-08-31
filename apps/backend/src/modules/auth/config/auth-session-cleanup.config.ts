import { registerAs } from '@nestjs/config';

export default registerAs('authSessionCleanup', () => ({
  enabled: process.env.AUTH_SESSION_CLEANUP_ENABLED !== 'false',
  retentionDays: Number(process.env.AUTH_SESSION_RETENTION_DAYS ?? 7),
  batchSize: Number(process.env.AUTH_SESSION_CLEANUP_BATCH_SIZE ?? 1000),
  maxBatches: Number(process.env.AUTH_SESSION_CLEANUP_MAX_BATCHES ?? 100),
  cron: process.env.AUTH_SESSION_CLEANUP_CRON ?? '0 0 2 * * *',
}));
