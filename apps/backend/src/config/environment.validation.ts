const REQUIRED_DATABASE_VARIABLES = [
  'DB_HOST',
  'DB_PORT',
  'DB_USERNAME',
  'DB_PASSWORD',
  'DB_DATABASE',
] as const;

export function validateEnvironment(
  environment: Record<string, unknown>,
): Record<string, unknown> {
  for (const variableName of REQUIRED_DATABASE_VARIABLES) {
    const value = environment[variableName];
    if (typeof value !== 'string' || value.trim() === '') {
      throw new Error(`Missing required environment variable: ${variableName}`);
    }
  }

  const databasePort = Number(environment.DB_PORT);
  if (
    !Number.isInteger(databasePort) ||
    databasePort < 1 ||
    databasePort > 65535
  ) {
    throw new Error('DB_PORT must be an integer between 1 and 65535');
  }

  for (const variableName of ['DB_SSL', 'DB_LOGGING'] as const) {
    const value = environment[variableName];
    if (value !== undefined && value !== 'true' && value !== 'false') {
      throw new Error(`${variableName} must be either "true" or "false"`);
    }
  }

  return environment;
}
