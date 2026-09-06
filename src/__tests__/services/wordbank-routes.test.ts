import type { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const updateList = vi.hoisted(() => vi.fn());
const saveMany = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api/middlewares', () => ({
  withAuth:
    (handler: any) =>
    (req: Request, ...args: any[]) =>
      handler(req, { user: { id: 'user-1' } }, ...args),
}));

vi.mock('@/services/english/SavedVocabularyService', () => ({
  SavedVocabularyService: {
    saveMany,
    updateList,
  },
}));

function jsonRequest(body: unknown): NextRequest {
  return {
    json: async () => body,
  } as NextRequest;
}

describe('Wordbank routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('accepts a full source sentence as a saved vocabulary example', async () => {
    const fullSentence = `${'A'.repeat(798)}.`;
    saveMany.mockResolvedValue({
      savedCount: 1,
      savedWords: ['resilient'],
      total: 1,
    });
    const { POST } = await import('@/app/api/v1/english/wordbank/route');

    const response = await POST(
      jsonRequest({
        vocabulary: [
          {
            word: 'resilient',
            partOfSpeech: 'adjective',
            ipa: null,
            audioUrl: null,
            englishDefinition: 'Able to recover quickly.',
            vietnameseTranslation: 'Kiên cường; hồi phục nhanh.',
            exampleSentence: fullSentence,
          },
        ],
      })
    );

    expect(response.status).toBe(200);
    expect(saveMany).toHaveBeenCalledWith('user-1', [
      expect.objectContaining({ exampleSentence: fullSentence }),
    ]);
  });

  it('accepts duplicate words in one save request', async () => {
    saveMany.mockResolvedValue({
      savedCount: 2,
      savedWords: ['run', 'run'],
      total: 2,
    });
    const { POST } = await import('@/app/api/v1/english/wordbank/route');

    const response = await POST(
      jsonRequest({
        vocabulary: [
          {
            word: 'run',
            partOfSpeech: 'verb',
            ipa: null,
            audioUrl: null,
            englishDefinition: 'To move quickly on foot.',
            vietnameseTranslation: 'Chạy.',
            exampleSentence: 'I run every morning.',
          },
          {
            word: 'run',
            partOfSpeech: 'noun',
            ipa: null,
            audioUrl: null,
            englishDefinition: 'A period of continuous operation.',
            vietnameseTranslation: 'Một giai đoạn vận hành liên tục.',
            exampleSentence: 'The machine had a long run.',
          },
        ],
      })
    );

    expect(response.status).toBe(200);
    expect(saveMany).toHaveBeenCalledWith('user-1', [
      expect.objectContaining({
        word: 'run',
        englishDefinition: 'To move quickly on foot.',
      }),
      expect.objectContaining({
        word: 'run',
        englishDefinition: 'A period of continuous operation.',
      }),
    ]);
  });

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
