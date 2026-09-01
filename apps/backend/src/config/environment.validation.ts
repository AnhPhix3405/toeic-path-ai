import { durationToSeconds } from './jwt.config';
import { validateCronExpression } from 'cron';

const REQUIRED_DATABASE_VARIABLES = [
  'DB_HOST',
  'DB_PORT',
  'DB_USERNAME',
  'DB_PASSWORD',
  'DB_DATABASE',
] as const;

const REQUIRED_AUTH_VARIABLES = ['JWT_PRIVATE_KEY_PATH', 'JWT_PUBLIC_KEY_PATH'] as const;

export function validateEnvironment(environment: Record<string, unknown>): Record<string, unknown> {
  for (const variableName of REQUIRED_DATABASE_VARIABLES) {
    const value = environment[variableName];
    if (typeof value !== 'string' || value.trim() === '') {
      throw new Error(`Missing required environment variable: ${variableName}`);
    }
  }

  for (const variableName of REQUIRED_AUTH_VARIABLES) {
    const value = environment[variableName];
    if (typeof value !== 'string' || value.trim() === '') {
      throw new Error(`Missing required environment variable: ${variableName}`);
    }
  }

  const termsVersion = environment.TERMS_VERSION;
  if (typeof termsVersion !== 'string' || termsVersion.trim() === '' || termsVersion.length > 30) {
    throw new Error('TERMS_VERSION must be a non-empty string of at most 30 characters');
  }

  const saltRounds = Number(environment.BCRYPT_SALT_ROUNDS ?? 12);
  if (!Number.isInteger(saltRounds) || saltRounds < 10 || saltRounds > 15) {
    throw new Error('BCRYPT_SALT_ROUNDS must be an integer between 10 and 15');
  }

  const databasePort = Number(environment.DB_PORT);
  if (!Number.isInteger(databasePort) || databasePort < 1 || databasePort > 65535) {
    throw new Error('DB_PORT must be an integer between 1 and 65535');
  }

  for (const variableName of ['DB_SSL', 'DB_LOGGING'] as const) {
    const value = environment[variableName];
    if (value !== undefined && value !== 'true' && value !== 'false') {
      throw new Error(`${variableName} must be either "true" or "false"`);
    }
  }

  const cookieSecure = environment.REFRESH_COOKIE_SECURE ?? 'false';
  if (cookieSecure !== 'true' && cookieSecure !== 'false') {
    throw new Error('REFRESH_COOKIE_SECURE must be either "true" or "false"');
  }

  const cookieSameSite = environment.REFRESH_COOKIE_SAME_SITE ?? 'lax';
  if (typeof cookieSameSite !== 'string' || !['lax', 'strict', 'none'].includes(cookieSameSite)) {
    throw new Error('REFRESH_COOKIE_SAME_SITE must be "lax", "strict", or "none"');
  }
  if (cookieSameSite === 'none' && cookieSecure !== 'true') {
    throw new Error('REFRESH_COOKIE_SECURE must be true when REFRESH_COOKIE_SAME_SITE is none');
  }

  const cookieMaxAge = Number(environment.REFRESH_COOKIE_MAX_AGE_MS ?? 604800000);
  if (!Number.isInteger(cookieMaxAge) || cookieMaxAge <= 0) {
    throw new Error('REFRESH_COOKIE_MAX_AGE_MS must be a positive integer');
  }
  const refreshExpiresIn = environment.JWT_REFRESH_EXPIRES_IN ?? '7d';
  if (typeof refreshExpiresIn !== 'string') {
    throw new Error('JWT_REFRESH_EXPIRES_IN must be a duration string');
  }
  if (cookieMaxAge !== durationToSeconds(refreshExpiresIn) * 1000) {
    throw new Error('REFRESH_COOKIE_MAX_AGE_MS must match JWT_REFRESH_EXPIRES_IN');
  }

  const cleanupEnabled = environment.AUTH_SESSION_CLEANUP_ENABLED ?? 'true';
  if (cleanupEnabled !== 'true' && cleanupEnabled !== 'false') {
    throw new Error('AUTH_SESSION_CLEANUP_ENABLED must be either "true" or "false"');
  }

  const retentionDays = Number(environment.AUTH_SESSION_RETENTION_DAYS ?? 7);
  if (!Number.isInteger(retentionDays) || retentionDays < 0) {
    throw new Error('AUTH_SESSION_RETENTION_DAYS must be a non-negative integer');
  }

  const cleanupBatchSize = Number(environment.AUTH_SESSION_CLEANUP_BATCH_SIZE ?? 1000);
  if (!Number.isInteger(cleanupBatchSize) || cleanupBatchSize < 1 || cleanupBatchSize > 10_000) {
    throw new Error('AUTH_SESSION_CLEANUP_BATCH_SIZE must be an integer between 1 and 10000');
  }

  const maxBatches = Number(environment.AUTH_SESSION_CLEANUP_MAX_BATCHES ?? 100);
  if (!Number.isInteger(maxBatches) || maxBatches < 1) {
    throw new Error('AUTH_SESSION_CLEANUP_MAX_BATCHES must be a positive integer');
  }

  const cleanupCron = environment.AUTH_SESSION_CLEANUP_CRON ?? '0 0 2 * * *';
  if (typeof cleanupCron !== 'string' || !validateCronExpression(cleanupCron).valid) {
    throw new Error('AUTH_SESSION_CLEANUP_CRON must be a valid cron expression');
  }

  const resetTtl = Number(environment.PASSWORD_RESET_TOKEN_TTL_MINUTES ?? 30);
  if (!Number.isInteger(resetTtl) || resetTtl <= 0) {
    throw new Error('PASSWORD_RESET_TOKEN_TTL_MINUTES must be a positive integer');
  }
  const resetUrl = environment.PASSWORD_RESET_URL;
  if (typeof resetUrl !== 'string' || resetUrl.trim() === '') {
    throw new Error('Missing required environment variable: PASSWORD_RESET_URL');
  }
  try {
    new URL(resetUrl);
  } catch {
    throw new Error('PASSWORD_RESET_URL must be a valid URL');
  }

  const mailFrom = environment.MAIL_FROM;
  if (typeof mailFrom !== 'string' || mailFrom.trim() === '') {
    throw new Error('Missing required environment variable: MAIL_FROM');
  }

  return environment;
}
