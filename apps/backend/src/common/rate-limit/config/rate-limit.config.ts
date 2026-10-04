import { registerAs } from '@nestjs/config';

const integer = (name: string, fallback: number): number =>
  Number.parseInt(process.env[name] ?? String(fallback), 10);

export default registerAs('rateLimit', () => ({
  enabled: process.env.RATE_LIMIT_ENABLED !== 'false',
  environment: process.env.NODE_ENV ?? 'development',
  register: {
    ttl: integer('RATE_LIMIT_REGISTER_TTL_SECONDS', 900),
    ip: integer('RATE_LIMIT_REGISTER_IP_MAX', 5),
  },
  login: {
    ttl: integer('RATE_LIMIT_LOGIN_TTL_SECONDS', 900),
    ip: integer('RATE_LIMIT_LOGIN_IP_MAX', 20),
    emailFailure: integer('RATE_LIMIT_LOGIN_EMAIL_FAILURE_MAX', 5),
  },
  forgotPassword: {
    ttl: integer('RATE_LIMIT_FORGOT_PASSWORD_TTL_SECONDS', 900),
    ip: integer('RATE_LIMIT_FORGOT_PASSWORD_IP_MAX', 5),
    email: integer('RATE_LIMIT_FORGOT_PASSWORD_EMAIL_MAX', 3),
  },
  resetPassword: {
    ttl: integer('RATE_LIMIT_RESET_PASSWORD_TTL_SECONDS', 900),
    ip: integer('RATE_LIMIT_RESET_PASSWORD_IP_MAX', 5),
    token: integer('RATE_LIMIT_RESET_PASSWORD_TOKEN_MAX', 5),
  },
  refresh: {
    ttl: integer('RATE_LIMIT_REFRESH_TTL_SECONDS', 300),
    ip: integer('RATE_LIMIT_REFRESH_IP_MAX', 60),
    session: integer('RATE_LIMIT_REFRESH_SESSION_MAX', 20),
  },
  logout: {
    ttl: integer('RATE_LIMIT_LOGOUT_TTL_SECONDS', 300),
    max: integer('RATE_LIMIT_LOGOUT_MAX', 30),
  },
  uploadAvatar: {
    ttl: integer('RATE_LIMIT_UPLOAD_AVATAR_TTL_SECONDS', 60),
    user: integer('RATE_LIMIT_UPLOAD_AVATAR_USER_MAX', 5),
    ip: integer('RATE_LIMIT_UPLOAD_AVATAR_IP_MAX', 10),
  },
  uploadPresignedUrl: {
    ttl: integer('RATE_LIMIT_UPLOAD_PRESIGNED_TTL_SECONDS', 60),
    user: integer('RATE_LIMIT_UPLOAD_PRESIGNED_USER_MAX', 20),
    ip: integer('RATE_LIMIT_UPLOAD_PRESIGNED_IP_MAX', 40),
  },
  uploadBatchPresignedUrl: {
    ttl: integer('RATE_LIMIT_UPLOAD_BATCH_PRESIGNED_TTL_SECONDS', 60),
    user: integer('RATE_LIMIT_UPLOAD_BATCH_PRESIGNED_USER_MAX', 5),
    ip: integer('RATE_LIMIT_UPLOAD_BATCH_PRESIGNED_IP_MAX', 10),
  },
  uploadConfirm: {
    ttl: integer('RATE_LIMIT_UPLOAD_CONFIRM_TTL_SECONDS', 60),
    user: integer('RATE_LIMIT_UPLOAD_CONFIRM_USER_MAX', 30),
    ip: integer('RATE_LIMIT_UPLOAD_CONFIRM_IP_MAX', 60),
  },
}));

