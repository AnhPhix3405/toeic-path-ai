import { validateEnvironment } from './environment.validation';

describe('validateEnvironment - Mail & Brevo Configuration', () => {
  const baseValidEnv: Record<string, unknown> = {
    DB_HOST: 'localhost',
    DB_PORT: '5432',
    DB_USERNAME: 'postgres',
    DB_PASSWORD: 'password',
    DB_DATABASE: 'toeic_db',
    JWT_PRIVATE_KEY_PATH: 'test.key',
    JWT_PUBLIC_KEY_PATH: 'test.pub',
    TERMS_VERSION: 'v1.0',
    BCRYPT_SALT_ROUNDS: '12',
    SUPABASE_URL: 'https://xyz.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'secret-key',
    STORAGE_BUCKET_AVATARS: 'avatars',
    PASSWORD_RESET_URL: 'http://localhost:3000/auth/reset-password',
    PASSWORD_RESET_TOKEN_TTL_MINUTES: '15',
    MAIL_FROM: 'noreply@toeicpath.com',
    AUTH_ALLOWED_ORIGINS: 'http://localhost:3000',
  };

  it('should pass with default MAIL_PROVIDER=console without BREVO_API_KEY', () => {
    const env = { ...baseValidEnv, MAIL_PROVIDER: 'console' };
    expect(() => validateEnvironment(env)).not.toThrow();
  });

  it('should throw error when MAIL_PROVIDER is invalid', () => {
    const env = { ...baseValidEnv, MAIL_PROVIDER: 'invalid_provider' };
    expect(() => validateEnvironment(env)).toThrow(
      'MAIL_PROVIDER must be either "console" or "brevo"',
    );
  });

  it('should throw error when MAIL_PROVIDER=brevo but BREVO_API_KEY is missing', () => {
    const env = { ...baseValidEnv, MAIL_PROVIDER: 'brevo' };
    expect(() => validateEnvironment(env)).toThrow(
      'Missing required environment variable: BREVO_API_KEY when MAIL_PROVIDER is "brevo"',
    );
  });

  it('should pass when MAIL_PROVIDER=brevo and valid BREVO_API_KEY and MAIL_FROM_EMAIL are provided', () => {
    const env = {
      ...baseValidEnv,
      MAIL_PROVIDER: 'brevo',
      BREVO_API_KEY: 'xkeysib-test-api-key-1234567890',
      MAIL_FROM_EMAIL: 'auth@toeicpath.com',
      MAIL_FROM_NAME: 'TOEIC Path AI',
    };
    expect(() => validateEnvironment(env)).not.toThrow();
  });
});
