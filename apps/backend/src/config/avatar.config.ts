import { registerAs } from '@nestjs/config';

export default registerAs('avatar', () => ({
  maxSizeBytes: Number(process.env.AVATAR_MAX_SIZE_BYTES ?? 2_097_152),
  maxWidth: Number(process.env.AVATAR_MAX_WIDTH ?? 2048),
  maxHeight: Number(process.env.AVATAR_MAX_HEIGHT ?? 2048),
  outputWidth: Number(process.env.AVATAR_OUTPUT_WIDTH ?? 512),
  outputHeight: Number(process.env.AVATAR_OUTPUT_HEIGHT ?? 512),
  outputFormat: process.env.AVATAR_OUTPUT_FORMAT ?? 'webp',
  outputQuality: Number(process.env.AVATAR_OUTPUT_QUALITY ?? 85),
}));
