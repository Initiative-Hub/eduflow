import type { NextRequest } from 'next/server';
import { describe, expect, it, vi } from 'vitest';

const translate = vi.hoisted(() => vi.fn());
const analyze = vi.hoisted(() => vi.fn());

vi.mock('@/services/english/translation.service', () => ({
  TranslationService: {
    translate,
  },
}));

vi.mock('@/services/english/vocabulary.service', () => ({
  VocabularyService: {
    analyze,
  },
}));

function jsonRequest(body: unknown): NextRequest {
  return {
    json: async () => body,
  } as NextRequest;
}

describe('English API text limits', () => {
  it('rejects translation input longer than 1000 characters', async () => {
    const { POST } = await import('@/app/api/v1/english/translate/route');

    const response = await POST(
      jsonRequest({
        text: 'a'.repeat(1001),
        from: 'en',
        to: 'vi',
        provider: 'amazon',
      })
    );

    expect(response.status).toBe(400);
    expect(translate).not.toHaveBeenCalled();
  });

  it('rejects analysis input longer than 1000 characters', async () => {
    const { POST } = await import('@/app/api/v1/english/analyze/route');

    const response = await POST(
      jsonRequest({
        text: 'a'.repeat(1001),
      })
    );

    expect(response.status).toBe(400);
    expect(analyze).not.toHaveBeenCalled();
  });
});
