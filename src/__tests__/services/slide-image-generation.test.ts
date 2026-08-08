import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockSaveSlideGeneratedImage = vi.hoisted(() => vi.fn());

vi.mock('@/services/StorageService', () => ({
  StorageService: { saveSlideGeneratedImage: mockSaveSlideGeneratedImage },
}));

import { SlideImageGenerationService } from '@/services/SlideImageGenerationService';

/** Minimal valid PNG payload: signature plus padding. */
const PNG_BASE64 = Buffer.from(
  Uint8Array.from([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a,
    ...Array(64).fill(1),
  ])
).toString('base64');

function imageResponse() {
  return {
    ok: true,
    status: 200,
    json: async () => ({ data: [{ b64_json: PNG_BASE64 }] }),
  } as Response;
}

/** Mirrors Google AI Studio's regional refusal. */
function regionBlockedResponse(status: number, provider: string) {
  return {
    ok: false,
    status,
    text: async () =>
      JSON.stringify({
        error: {
          message: 'User location is not supported for the API use.',
          code: status,
          metadata: { provider_name: provider },
        },
      }),
  } as Response;
}

const REQUEST = {
  deckId: 'deck123',
  prompt: 'a minimalist blue circle',
  aspectRatio: '16:9' as const,
};

describe('SlideImageGenerationService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockSaveSlideGeneratedImage.mockReset();
    process.env.OPENROUTER_API_KEY = 'test-key';
  });

  it('falls back to the next model when a provider blocks the region', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(regionBlockedResponse(400, 'Google AI Studio'))
      .mockResolvedValueOnce(imageResponse());

    const result = await SlideImageGenerationService.generate(REQUEST);

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(result.imageUrl).toMatch(
      /^\/api\/v1\/ai\/slides\/deck123\/media\/[0-9a-f-]{36}$/
    );
    expect(mockSaveSlideGeneratedImage).toHaveBeenCalledTimes(1);
  });

  it('reports every provider message when all models fail', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(regionBlockedResponse(400, 'Google AI Studio'))
      .mockResolvedValueOnce(regionBlockedResponse(403, 'OpenAI'));

    await expect(SlideImageGenerationService.generate(REQUEST)).rejects.toThrow(
      /Google AI Studio[\s\S]*OpenAI|400[\s\S]*403/
    );

    expect(mockSaveSlideGeneratedImage).not.toHaveBeenCalled();
  });

  it('requests the known-working models in a fixed order', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(regionBlockedResponse(400, 'Google AI Studio'))
      .mockResolvedValueOnce(imageResponse());

    await SlideImageGenerationService.generate(REQUEST);

    const requestedModels = fetchSpy.mock.calls.map(
      (call) => JSON.parse((call[1] as RequestInit).body as string).model
    );
    expect(requestedModels).toEqual([
      'google/gemini-2.5-flash-image',
      'bytedance-seed/seedream-4.5',
    ]);
  });

  it('stores the real format when a provider ignores output_format', async () => {
    // seedream returns JPEG even when PNG is requested, and mislabels media_type.
    const jpegBase64 = Buffer.from(
      Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, ...Array(64).fill(2)])
    ).toString('base64');

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: [{ b64_json: jpegBase64, media_type: 'image/png' }],
      }),
    } as Response);

    await SlideImageGenerationService.generate(REQUEST);

    expect(mockSaveSlideGeneratedImage).toHaveBeenCalledWith(
      expect.objectContaining({ contentType: 'image/jpeg' })
    );
  });

  it('accepts webp payloads', async () => {
    const webp = Uint8Array.from([
      0x52,
      0x49,
      0x46,
      0x46,
      0,
      0,
      0,
      0,
      0x57,
      0x45,
      0x42,
      0x50,
      ...Array(32).fill(3),
    ]);

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: [{ b64_json: Buffer.from(webp).toString('base64') }],
      }),
    } as Response);

    await SlideImageGenerationService.generate(REQUEST);

    expect(mockSaveSlideGeneratedImage).toHaveBeenCalledWith(
      expect.objectContaining({ contentType: 'image/webp' })
    );
  });

  it('rejects payloads that are not real images', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: [{ b64_json: Buffer.from('not-an-image').toString('base64') }],
      }),
    } as Response);

    await expect(SlideImageGenerationService.generate(REQUEST)).rejects.toThrow(
      /not a supported image format/
    );
  });
});
