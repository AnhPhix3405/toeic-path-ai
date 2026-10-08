import { registerAs } from '@nestjs/config';

export default registerAs('mail', () => ({
  provider: process.env.MAIL_PROVIDER ?? 'console',
  brevoApiKey: process.env.BREVO_API_KEY,
  fromEmail: process.env.MAIL_FROM_EMAIL ?? process.env.MAIL_FROM ?? 'noreply@toeicpath.com',
  fromName: process.env.MAIL_FROM_NAME ?? 'TOEIC Path AI',
  passwordResetUrl: process.env.PASSWORD_RESET_URL ?? 'http://localhost:3000/auth/reset-password',
  passwordResetTokenTtlMinutes: Number.parseInt(
    process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES ?? '15',
    10,
  ),
}));
