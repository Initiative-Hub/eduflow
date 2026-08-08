import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockCreateObjectReadSignedUrl = vi.hoisted(() => vi.fn());

vi.mock('@/lib/storage/file-storage', () => ({
  createObjectReadSignedUrl: mockCreateObjectReadSignedUrl,
  FILE_TEMPLATES_BUCKET_NAME: 'eduflow-template',
  FILE_DEFAULT_TEMPLATES_BUCKET_NAME: 'eduflow-default-template',
}));

import { SlideService } from '@/services/SlideService';

/**
 * Every category stores its layout as `standard.svg`, so keying previews by
 * file name collapsed a whole collection into a single entry.
 */
const RMIT_PREVIEWS = {
  bucket: 'eduflow-template',
  previews: [
    {
      category: 'TITLE_SLIDE',
      variant: 'standard',
      key: 'templates/RMIT 2025 template/TITLE_SLIDE/preview.png',
    },
    {
      category: 'CONTENT_SLIDE',
      variant: 'standard',
      key: 'templates/RMIT 2025 template/CONTENT_SLIDE/preview.png',
    },
    {
      category: 'CHART_SLIDE',
      variant: 'standard',
      key: 'templates/RMIT 2025 template/CHART_SLIDE/preview.png',
    },
  ],
};

describe('SlideService.getTemplatePreviews', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    SlideService.clearCache();
    mockCreateObjectReadSignedUrl.mockReset();
    mockCreateObjectReadSignedUrl.mockImplementation(
      ({ objectKey, bucketName }: { objectKey: string; bucketName: string }) =>
        Promise.resolve(`https://signed.example/${bucketName}/${objectKey}`)
    );
  });

  function mockPreviewResponse(payload: unknown) {
    return vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      statusText: 'OK',
      json: async () => payload,
    } as Response);
  }

  it('returns one preview per category instead of collapsing shared file names', async () => {
    mockPreviewResponse(RMIT_PREVIEWS);

    const previews =
      await SlideService.getTemplatePreviews('RMIT 2025 template');

    expect(previews).toHaveLength(3);
    expect(previews.map((preview) => preview.category)).toEqual([
      'TITLE_SLIDE',
      'CONTENT_SLIDE',
      'CHART_SLIDE',
    ]);
  });

  it('serves signed URLs from the bucket owning the collection', async () => {
    mockPreviewResponse(RMIT_PREVIEWS);

    const previews =
      await SlideService.getTemplatePreviews('RMIT 2025 template');

    expect(previews[0].url).toBe(
      'https://signed.example/eduflow-template/templates/RMIT 2025 template/TITLE_SLIDE/preview.png'
    );
    expect(mockCreateObjectReadSignedUrl).toHaveBeenCalledTimes(3);
  });

  it('never returns SVG markup, keeping the payload small', async () => {
    mockPreviewResponse(RMIT_PREVIEWS);

    const previews =
      await SlideService.getTemplatePreviews('RMIT 2025 template');

    const serialized = JSON.stringify(previews);
    expect(serialized).not.toContain('<svg');
    expect(serialized.length).toBeLessThan(1000);
  });

  it('re-signs cached previews so expired URLs are not reused', async () => {
    const fetchSpy = mockPreviewResponse(RMIT_PREVIEWS);

    await SlideService.getTemplatePreviews('RMIT 2025 template');
    await SlideService.getTemplatePreviews('RMIT 2025 template');

    // The collection is fetched once, but URLs are signed on every call.
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(mockCreateObjectReadSignedUrl).toHaveBeenCalledTimes(6);
  });

  it('falls back to the default bucket for built-in collections', async () => {
    mockPreviewResponse({
      previews: [
        {
          category: 'TITLE_SLIDE',
          variant: 'standard',
          key: 'templates/vintage/TITLE_SLIDE/preview.png',
        },
      ],
    });

    const previews = await SlideService.getTemplatePreviews('vintage');

    expect(previews[0].url).toContain('eduflow-default-template');
  });

  it('surfaces preview service failures', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      statusText: 'Bad Gateway',
    } as Response);

    await expect(
      SlideService.getTemplatePreviews('RMIT 2025 template')
    ).rejects.toThrow('Failed to load template previews');
  });
});
