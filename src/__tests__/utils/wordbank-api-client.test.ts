import { describe, expect, it, vi } from 'vitest';

const apiClient = vi.hoisted(() => ({
  delete: vi.fn(),
  get: vi.fn(),
  patch: vi.fn(),
  post: vi.fn(),
}));

vi.mock('@/lib/api/api-client', () => ({
  apiClient,
}));

describe('wordbankApi', () => {
  it('uses shared apiClient paths rooted at v1', async () => {
    apiClient.get.mockResolvedValue({ items: [] });
    apiClient.delete.mockResolvedValue({ removedCount: 1 });

    const { wordbankApi } = await import(
      '@/app/[locale]/(dashboard)/english/wordbank/wordbank.service'
    );

    await wordbankApi.list({ search: ' comet ', listId: 'all' });
    await wordbankApi.remove('comet');

    expect(apiClient.get).toHaveBeenCalledWith('v1/english/wordbank', {
      params: { q: 'comet' },
    });
    expect(apiClient.delete).toHaveBeenCalledWith('v1/english/wordbank', {
      data: { word: 'comet' },
    });
  });
});
