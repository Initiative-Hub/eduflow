import { describe, expect, it } from 'vitest';
import { sanitizeUrl } from '@/utils/url-helper';

describe('sanitizeUrl', () => {
  it('keeps a safe relative return path intact', () => {
    expect(sanitizeUrl('  /dashboard?tab=profile#section  ')).toBe(
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
    expect(sanitizeUrl(value)).toBe(null);
  });
});
