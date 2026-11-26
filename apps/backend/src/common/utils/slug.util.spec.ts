import { slugifyVietnamese, formatPrefixedCode, generateAttemptCode } from './slug.util';
import { isUuidIdentifier, normalizeCodeIdentifier } from './identifier.util';

describe('slug.util & identifier.util (Review Focus 1 & PMR SEO-001 #1)', () => {
  it('normalizes Vietnamese diacritics including đ/Đ and strips punctuation', () => {
    expect(slugifyVietnamese('Đề thi ETS 2026: Test 01 - Full Mock')).toBe(
      'de-thi-ets-2026-test-01-full-mock',
    );
    expect(slugifyVietnamese('  ĐẶC BIỆT  ')).toBe('dac-biet');
    expect(slugifyVietnamese('!!!@@@###')).toBe('exam');
  });

  it('guards RESERVED_EXAM_SLUGS by appending -exam', () => {
    expect(slugifyVietnamese('Manage')).toBe('manage-exam');
    expect(slugifyVietnamese('Create')).toBe('create-exam');
    expect(slugifyVietnamese('instructions')).toBe('instructions-exam');
  });

  it('formats 5-digit zero-padded prefixed codes and generates non-sequential 14-char attempt codes', () => {
    expect(formatPrefixedCode('Q', 1)).toBe('Q-00001');
    expect(formatPrefixedCode('QG', 142)).toBe('QG-00142');
    expect(formatPrefixedCode('RP', 100000)).toBe('RP-100000');
    expect(formatPrefixedCode('IMP', 7)).toBe('IMP-00007');

    const c1 = generateAttemptCode();
    const c2 = generateAttemptCode();
    expect(c1).toMatch(/^att_[A-Za-z0-9]{10}$/);
    expect(c1).not.toBe(c2);
  });

  it('detects UUID vs human-readable code/slug cleanly', () => {
    expect(isUuidIdentifier('d0000000-0000-4000-8000-000000000001')).toBe(true);
    expect(isUuidIdentifier('q-00001')).toBe(false);
    expect(isUuidIdentifier('ets-toeic-2026-test-01')).toBe(false);
    expect(normalizeCodeIdentifier('  q-00042 ')).toBe('Q-00042');
  });
});
