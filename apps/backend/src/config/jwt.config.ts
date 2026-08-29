import { readFileSync } from 'node:fs';
import { registerAs } from '@nestjs/config';

const DURATION_PATTERN = /^(\d+)(s|m|h|d)$/;

export function durationToSeconds(value: string): number {
  const match = DURATION_PATTERN.exec(value);
  if (!match) {
    throw new Error(`Invalid JWT duration: ${value}`);
  }

  const amount = Number(match[1]);
  const multipliers = { s: 1, m: 60, h: 3600, d: 86400 } as const;
  return amount * multipliers[match[2] as keyof typeof multipliers];
}

export default registerAs('jwt', () => {
  const privateKeyPath = process.env.JWT_PRIVATE_KEY_PATH;
  const publicKeyPath = process.env.JWT_PUBLIC_KEY_PATH;

  if (!privateKeyPath || !publicKeyPath) {
    throw new Error('JWT RSA key paths are required');
  }

  const accessExpiresIn = process.env.JWT_ACCESS_EXPIRES_IN ?? '15m';
  const refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN ?? '7d';

  return {
    privateKey: readFileSync(privateKeyPath, 'utf8'),
    publicKey: readFileSync(publicKeyPath, 'utf8'),
    accessExpiresIn,
    refreshExpiresIn,
    accessExpiresInSeconds: durationToSeconds(accessExpiresIn),
    refreshExpiresInSeconds: durationToSeconds(refreshExpiresIn),
  };
});
