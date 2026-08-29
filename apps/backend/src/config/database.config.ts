import { registerAs } from '@nestjs/config';

const isEnabled = (value: string | undefined): boolean => value === 'true';

export default registerAs('database', () => ({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  name: process.env.DB_DATABASE,
  ssl: isEnabled(process.env.DB_SSL),
  logging: isEnabled(process.env.DB_LOGGING),
}));
