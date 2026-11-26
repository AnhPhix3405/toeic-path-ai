import { randomBytes } from 'crypto';

export const RESERVED_EXAM_SLUGS: ReadonlySet<string> = new Set([
  'create',
  'manage',
  'new',
  'edit',
  'instructions',
  'builder',
  'public',
  'overview',
  'import',
]);

const BASE62_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

/**
 * Normalizes Vietnamese & Unicode strings into SEO-friendly URL slugs.
 * - Maps đ/Đ -> d before NFD decomposition.
 * - Strips leading/trailing hyphens after slicing to 240 chars.
 * - Falls back to 'exam' for punctuation-only titles (PMR SEO-001 #1).
 * - Guards RESERVED_EXAM_SLUGS by appending '-exam'.
 */
export function slugifyVietnamese(raw: string): string {
  const normalized = (raw ?? '')
    .trim()
    .replace(/[đĐ]/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 240)
    .replace(/^-+|-+$/g, '');

  const base = normalized || 'exam';
  return RESERVED_EXAM_SLUGS.has(base) ? `${base}-exam` : base;
}

/**
 * Formats a PostgreSQL SEQUENCE number into a 5-digit zero-padded prefixed code.
 * Example: formatPrefixedCode('Q', 1) => 'Q-00001'
 */
export function formatPrefixedCode(
  prefix: 'Q' | 'QG' | 'RP' | 'IMP',
  seqNumber: number | string,
): string {
  return `${prefix}-${String(seqNumber).padStart(5, '0')}`;
}

/**
 * Generates a cryptographically random, non-sequential ExamAttempt code (Decision 2B).
 * Format: att_<10 base62 chars>, e.g., att_9xK2mP7qR4 (~59.5 bits of entropy, anti-IDOR).
 */
export function generateAttemptCode(): string {
  const bytes = randomBytes(10);
  let suffix = '';
  for (let i = 0; i < 10; i++) {
    suffix += BASE62_ALPHABET[bytes[i] % BASE62_ALPHABET.length];
  }
  return `att_${suffix}`;
}
