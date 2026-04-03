import { describe, expect, it } from 'vitest';
import { sanitizeNextUrl } from '@/utils/url-helper';

describe('sanitizeNextUrl', () => {
  it('keeps a safe relative return path intact', () => {
    expect(sanitizeNextUrl('  /dashboard?tab=profile#section  ')).toBe(
      '/dashboard?tab=profile#section'
    );
  });

  it.each([
    'https://evil.example/steal',
    '//evil.example/steal',
    '///evil.example/steal',
    'javascript:alert(1)',
    '  ',
    '/dashboard\r\nSet-Cookie: attack=true',
    '\\evil.example\\steal',
  ])('falls back for unsafe nextUrl value %s', (value) => {
    expect(sanitizeNextUrl(value)).toBe(null);
  });
});
