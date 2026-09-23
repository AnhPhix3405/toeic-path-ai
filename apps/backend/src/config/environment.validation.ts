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

  if ((environment.STORAGE_PROVIDER ?? 'supabase') !== 'supabase') {
    throw new Error('STORAGE_PROVIDER must be "supabase"');
  }
  for (const variableName of [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'STORAGE_BUCKET_AVATARS',
  ] as const) {
    const value = environment[variableName];
    if (typeof value !== 'string' || value.trim() === '') {
      throw new Error(`Missing required environment variable: ${variableName}`);
    }
  }
  try {
    new URL(environment.SUPABASE_URL as string);
  } catch {
    throw new Error('SUPABASE_URL must be a valid URL');
  }

  const positiveIntegerSettings = [
    ['AVATAR_MAX_SIZE_BYTES', 2_097_152],
    ['AVATAR_MAX_WIDTH', 2048],
    ['AVATAR_MAX_HEIGHT', 2048],
    ['AVATAR_OUTPUT_WIDTH', 512],
    ['AVATAR_OUTPUT_HEIGHT', 512],
  ] as const;
  for (const [name, fallback] of positiveIntegerSettings) {
    const value = Number(environment[name] ?? fallback);
    if (!Number.isInteger(value) || value <= 0)
      throw new Error(`${name} must be a positive integer`);
  }
  if ((environment.AVATAR_OUTPUT_FORMAT ?? 'webp') !== 'webp') {
    throw new Error('AVATAR_OUTPUT_FORMAT must be "webp"');
  }
  const avatarQuality = Number(environment.AVATAR_OUTPUT_QUALITY ?? 85);
  if (!Number.isInteger(avatarQuality) || avatarQuality < 1 || avatarQuality > 100) {
    throw new Error('AVATAR_OUTPUT_QUALITY must be an integer between 1 and 100');
  }

  if (
    (environment.RATE_LIMIT_ENABLED ?? 'true') !== 'true' &&
    (environment.RATE_LIMIT_ENABLED ?? 'true') !== 'false'
  ) {
    throw new Error('RATE_LIMIT_ENABLED must be either "true" or "false"');
  }
  if (
    (environment.NODE_ENV ?? 'development') === 'production' &&
    environment.RATE_LIMIT_ENABLED === 'false'
  ) {
    throw new Error('RATE_LIMIT_ENABLED cannot be false in production');
  }
  const rateLimitSettings = [
    ['RATE_LIMIT_REGISTER_TTL_SECONDS', 900],
    ['RATE_LIMIT_REGISTER_IP_MAX', 5],
    ['RATE_LIMIT_LOGIN_TTL_SECONDS', 900],
    ['RATE_LIMIT_LOGIN_IP_MAX', 20],
    ['RATE_LIMIT_LOGIN_EMAIL_FAILURE_MAX', 5],
    ['RATE_LIMIT_FORGOT_PASSWORD_TTL_SECONDS', 900],
    ['RATE_LIMIT_FORGOT_PASSWORD_IP_MAX', 5],
    ['RATE_LIMIT_FORGOT_PASSWORD_EMAIL_MAX', 3],
    ['RATE_LIMIT_RESET_PASSWORD_TTL_SECONDS', 900],
    ['RATE_LIMIT_RESET_PASSWORD_IP_MAX', 5],
    ['RATE_LIMIT_RESET_PASSWORD_TOKEN_MAX', 5],
    ['RATE_LIMIT_REFRESH_TTL_SECONDS', 300],
    ['RATE_LIMIT_REFRESH_IP_MAX', 60],
    ['RATE_LIMIT_REFRESH_SESSION_MAX', 20],
    ['RATE_LIMIT_LOGOUT_TTL_SECONDS', 300],
    ['RATE_LIMIT_LOGOUT_MAX', 30],
  ] as const;
  for (const [name, fallback] of rateLimitSettings) {
    const value = Number(environment[name] ?? fallback);
    if (!Number.isInteger(value) || value <= 0)
      throw new Error(`${name} must be a positive integer`);
  }
  const trustProxyHops = Number(environment.TRUST_PROXY_HOPS ?? 0);
  if (!Number.isInteger(trustProxyHops) || trustProxyHops < 0) {
    throw new Error('TRUST_PROXY_HOPS must be a non-negative integer');
  }
  const authAllowedOrigins = environment.AUTH_ALLOWED_ORIGINS ?? environment.CORS_ORIGINS;
  if (typeof authAllowedOrigins !== 'string' || authAllowedOrigins.trim() === '') {
    throw new Error('AUTH_ALLOWED_ORIGINS or CORS_ORIGINS must contain at least one origin');
  }

  const securityLogging = environment.SECURITY_EVENT_LOGGING_ENABLED ?? 'true';
  if (typeof securityLogging !== 'string' || !['true', 'false'].includes(securityLogging))
    throw new Error('SECURITY_EVENT_LOGGING_ENABLED must be either "true" or "false"');
  const securityLevel = environment.SECURITY_EVENT_LOG_LEVEL ?? 'info';
  if (typeof securityLevel !== 'string' || !['info', 'warn', 'error'].includes(securityLevel))
    throw new Error('SECURITY_EVENT_LOG_LEVEL must be info, warn, or error');
  const userAgentMax = Number(environment.SECURITY_EVENT_USER_AGENT_MAX_LENGTH ?? 500);
  if (!Number.isInteger(userAgentMax) || userAgentMax <= 0)
    throw new Error('SECURITY_EVENT_USER_AGENT_MAX_LENGTH must be a positive integer');
  const sampleRate = Number(environment.SECURITY_EVENT_LOGIN_FAILURE_SAMPLE_RATE ?? 1);
  if (!Number.isFinite(sampleRate) || sampleRate < 0 || sampleRate > 1)
    throw new Error('SECURITY_EVENT_LOGIN_FAILURE_SAMPLE_RATE must be between 0 and 1');
  const includeIp = environment.SECURITY_EVENT_INCLUDE_IP ?? 'true';
  if (typeof includeIp !== 'string' || !['true', 'false'].includes(includeIp))
    throw new Error('SECURITY_EVENT_INCLUDE_IP must be either "true" or "false"');
  if ((environment.NODE_ENV ?? 'development') === 'production') {
    const hmacKey = environment.SECURITY_EVENT_HMAC_KEY;
    if (typeof hmacKey !== 'string' || hmacKey.length < 32)
      throw new Error('SECURITY_EVENT_HMAC_KEY must contain at least 32 characters in production');
    const googleClientId = environment.GOOGLE_CLIENT_ID;
    if (typeof googleClientId !== 'string' || googleClientId.trim() === '') {
      throw new Error('GOOGLE_CLIENT_ID must be configured in production');
    }
  }

  return environment;
}
