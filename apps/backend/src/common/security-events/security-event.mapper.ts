import { METADATA_ALLOWLIST, REDACTED, SENSITIVE_KEYS } from './security-event.constants';

export function sanitizeUserAgent(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const sanitized = [...value]
    .filter((character) => character.charCodeAt(0) > 31 && character.charCodeAt(0) !== 127)
    .join('')
    .slice(0, maxLength);
  return sanitized || undefined;
}

export function sanitizeMetadata(
  metadata?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (!metadata) return undefined;
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    const normalized = key.toLowerCase();
    if (SENSITIVE_KEYS.has(normalized)) {
      output[key] = REDACTED;
    } else if (
      METADATA_ALLOWLIST.has(key) &&
      (value === null || ['string', 'number', 'boolean'].includes(typeof value))
    ) {
      output[key] = value;
    }
  }
  return Object.keys(output).length ? output : undefined;
}
