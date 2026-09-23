import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  corsOrigins: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : ['http://localhost:3000'],
  authAllowedOrigins: process.env.AUTH_ALLOWED_ORIGINS
    ? process.env.AUTH_ALLOWED_ORIGINS.split(',').map((origin) => origin.trim())
    : (process.env.CORS_ORIGINS?.split(',').map((origin) => origin.trim()) ?? [
        'http://localhost:3000',
      ]),
  trustProxyHops: Number.parseInt(process.env.TRUST_PROXY_HOPS ?? '0', 10),
  jsonBodyLimit: process.env.JSON_BODY_LIMIT ?? '16kb',
  termsVersion: process.env.TERMS_VERSION,
  googleClientId: process.env.GOOGLE_CLIENT_ID,
}));
