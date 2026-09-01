import { registerAs } from '@nestjs/config';

export default registerAs('passwordReset', () => ({
  tokenTtlMinutes: Number(process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES ?? 30),
  url: process.env.PASSWORD_RESET_URL,
}));
