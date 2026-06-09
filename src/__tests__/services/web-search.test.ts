import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateSupplementarySearchContexts } from '@/services/ai/web-search';

const mocks = vi.hoisted(() => ({
  generateText: vi.fn(),
  streamText: vi.fn(),
  tavilySearch: vi.fn(() => ({ type: 'tavily-search-tool' })),
}));

vi.mock('ai', () => ({
  generateText: mocks.generateText,
  streamText: mocks.streamText,
  Output: {
    array: vi.fn((config) => ({ kind: 'array-output', ...config })),
  },
  stepCountIs: vi.fn((count: number) => ({ count })),
}));

vi.mock('@tavily/ai-sdk', () => ({
  tavilySearch: mocks.tavilySearch,
}));

async function* streamElements<T>(elements: T[]) {
  for (const element of elements) {
    yield element;
  }
}

describe('generateSupplementarySearchContexts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('streams discovered web and youtube sources before returning final contexts', async () => {
    const webSource = {
      title: 'Current formative assessment strategies',
      url: 'https://example.edu/assessment',
      summary: 'A concise summary for the web source.',
      content: 'Full extracted web content.',
    };
    const youtubeSource = {
      title: 'Assessment walkthrough video',
      url: 'https://www.youtube.com/watch?v=abc123xyz00',
      summary: 'A concise summary for the video.',
      content: 'Full extracted video context.',
    };

    mocks.streamText
      .mockReturnValueOnce({
        elementStream: streamElements([webSource]),
        output: Promise.resolve([webSource]),
      })
      .mockReturnValueOnce({
        elementStream: streamElements([youtubeSource]),
        output: Promise.resolve([youtubeSource]),
      });

    const emittedSources: unknown[] = [];
    const completedSearches: unknown[] = [];

    const result = await generateSupplementarySearchContexts({
      model: {} as never,
      searchQuery: ' formative assessment ',
      onSource: (event) => {
        emittedSources.push(event);
      },
      onSearchComplete: (event) => {
        completedSearches.push(event);
      },
    });

    expect(mocks.generateText).not.toHaveBeenCalled();
    expect(mocks.streamText).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      webContext: [webSource],
      youtubeContext: [youtubeSource],
    });
    expect(emittedSources).toHaveLength(2);
    expect(emittedSources).toEqual(
      expect.arrayContaining([
        {
          sourceKind: 'web',
          source: {
            title: webSource.title,
            url: webSource.url,
            summary: webSource.summary,
          },
        },
        {
          sourceKind: 'youtube',
          source: {
            title: youtubeSource.title,
            url: youtubeSource.url,
            summary: youtubeSource.summary,
          },
        },
      ])
    );
    expect(completedSearches).toHaveLength(2);
    expect(completedSearches).toEqual(
      expect.arrayContaining([
        { sourceKind: 'web', count: 1 },
        { sourceKind: 'youtube', count: 1 },
      ])
    );
  });
});
