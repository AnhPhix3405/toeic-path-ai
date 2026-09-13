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
}));
