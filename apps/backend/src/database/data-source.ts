import 'reflect-metadata';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';

config();

const requiredEnvironmentVariable = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

const databasePort = Number(requiredEnvironmentVariable('DB_PORT'));
if (!Number.isInteger(databasePort)) {
  throw new Error('DB_PORT must be an integer');
}

export default new DataSource({
  type: 'postgres',
  host: requiredEnvironmentVariable('DB_HOST'),
  port: databasePort,
  username: requiredEnvironmentVariable('DB_USERNAME'),
  password: requiredEnvironmentVariable('DB_PASSWORD'),
  database: requiredEnvironmentVariable('DB_DATABASE'),
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  logging: process.env.DB_LOGGING === 'true',
  synchronize: false,
  migrationsRun: false,
  entities: [`${__dirname}/../modules/**/*.entity{.ts,.js}`],
  migrations: [`${__dirname}/migrations/*{.ts,.js}`],
});
