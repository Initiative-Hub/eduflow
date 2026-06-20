import type { NextRequest } from 'next/server';
import { describe, expect, it, vi } from 'vitest';

const updateList = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api/middlewares', () => ({
  withAuth:
    (handler: any) =>
    (req: Request, ...args: any[]) =>
      handler(req, { user: { id: 'user-1' } }, ...args),
}));

vi.mock('@/services/english/SavedVocabularyService', () => ({
  SavedVocabularyService: {
    updateList,
  },
}));

function jsonRequest(body: unknown): NextRequest {
  return {
    json: async () => body,
  } as NextRequest;
}

describe('Wordbank routes', () => {
  it('returns not found when updating a missing word list', async () => {
    updateList.mockRejectedValue(new Error('Word List not found'));
    const { PATCH } = await import(
      '@/app/api/v1/english/wordbank/lists/[listId]/route'
    );

    const response = await PATCH(jsonRequest({ name: 'Astronomy' }), {
      params: Promise.resolve({
        listId: '11111111-1111-4111-8111-111111111111',
      }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      message: 'Word List not found',
    });
  });
});
