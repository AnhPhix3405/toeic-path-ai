const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Returns true if the identifier string is a standard UUID (used for Dual-Lookup APIs).
 */
export function isUuidIdentifier(value: string): boolean {
  return typeof value === 'string' && UUID_REGEX.test(value.trim());
}

/**
 * Normalizes human-readable prefixed codes (e.g. ' q-00042 ' -> 'Q-00042') for case-insensitive lookup.
 */
export function normalizeCodeIdentifier(value: string): string {
  return value.trim().toUpperCase();
}
