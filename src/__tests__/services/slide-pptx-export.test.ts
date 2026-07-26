import { describe, expect, it, vi } from 'vitest';

const mockGet = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api/api-client', () => ({
  apiClient: { get: mockGet, post: vi.fn() },
}));

import { slideService } from '@/app/[locale]/(dashboard)/courses/[courseId]/lessons/[lessonId]/slide.service';

/**
 * Exporting rasterizes every slide server-side. A 20-slide deck measured ~40s,
 * so the shared client's 20s default aborted the request mid-flight and surfaced
 * as "An unexpected error occurred" with no status.
 */
describe('PPTX export request', () => {
  it('allows far longer than the shared 20s client default', async () => {
    mockGet.mockResolvedValue(new Blob(['pptx']));

    await slideService.downloadPptxBlob('73402d37e806');

    const [url, config] = mockGet.mock.calls[0];
    expect(url).toBe('/v1/ai/slides/73402d37e806/pptx');
    expect(config.responseType).toBe('blob');
    expect(config.timeout).toBeGreaterThanOrEqual(120_000);
  });
});
