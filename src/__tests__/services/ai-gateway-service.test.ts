import { streamObject } from 'ai';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { pdfToMarkdown } from '@/lib/pdf';
import { AIGatewayService } from '@/services/ai/AIGatewayService';
import { StorageService } from '@/services/StorageService';

vi.mock('ai', () => ({
  gateway: vi.fn((model: string) => model),
  streamObject: vi.fn(),
}));

vi.mock('@/lib/pdf', () => ({
  pdfToMarkdown: vi.fn(),
}));

vi.mock('@/services/StorageService', () => ({
  StorageService: {
    getDownloadPayload: vi.fn(),
  },
}));

describe('AIGatewayService', () => {
  const originalApiKey = process.env.AI_GATEWAY_API_KEY;

  afterEach(() => {
    if (originalApiKey === undefined) {
      delete process.env.AI_GATEWAY_API_KEY;
      return;
    }

    process.env.AI_GATEWAY_API_KEY = originalApiKey;
  });

  it('uses provided apiKey when streaming course', async () => {
    delete process.env.AI_GATEWAY_API_KEY;

    (
      StorageService.getDownloadPayload as ReturnType<typeof vi.fn>
    ).mockResolvedValue({ bytes: new Uint8Array([1, 2, 3]) });
    (pdfToMarkdown as ReturnType<typeof vi.fn>).mockResolvedValue(
      'course content'
    );
    (streamObject as ReturnType<typeof vi.fn>).mockReturnValue({});

    const service = new AIGatewayService();

    await service.streamCourse({
      userId: 'user-1',
      fileId: 'file-1',
      apiKey: 'test-key',
    });

    expect(streamObject).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: { Authorization: 'Bearer test-key' },
      })
    );
  });
});
