export const SECURITY_EVENT_WRITER = Symbol('SECURITY_EVENT_WRITER');
export const REDACTED = '[REDACTED]';
export const SENSITIVE_KEYS = new Set([
  'password',
  'confirmpassword',
  'passwordhash',
  'accesstoken',
  'refreshtoken',
  'refreshtokenhash',
  'resettoken',
  'resettokenhash',
  'authorization',
  'cookie',
  'set-cookie',
  'privatekey',
  'publickey',
  'apikey',
  'apisecret',
  'tokenfingerprint',
]);
export const METADATA_ALLOWLIST = new Set([
  'oldSessionId',
  'newSessionId',
  'sessionRevoked',
  'alreadyRevoked',
  'revokedSessionCount',
  'oldRole',
  'newRole',
  'endpoint',
  'policyName',
  'retryAfterSeconds',
  'tokenFamilyId',
]);
