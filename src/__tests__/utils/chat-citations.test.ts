import type { UIMessage } from 'ai';
import { describe, expect, it } from 'vitest';
import {
  buildInlineCitationMarkdown,
  getCitationSources,
} from '@/utils/chat-citations';

describe('chat citation helpers', () => {
  it('collects citation sources from native source parts and Tavily tool output', () => {
    const parts = [
      {
        type: 'source-url',
        sourceId: 'source-1',
        url: 'https://example.edu/research',
        title: 'Research Primer',
      },
      {
        type: 'tool-webSearch',
        toolCallId: 'call-1',
        state: 'output-available',
        input: { query: 'learning science' },
        output: {
          results: [
            {
              title: 'Learning Science Review',
              url: 'https://journal.example/review',
              content: 'A review of learning science findings.',
              favicon: 'https://journal.example/favicon.ico',
            },
            {
              title: 'Duplicate should be skipped',
              url: 'https://example.edu/research',
              content: 'Already emitted as a source part.',
            },
            {
              title: 'Fallback favicon source',
              url: 'https://fallback.example/article',
              content: 'A source without Tavily favicon metadata.',
            },
          ],
        },
      },
    ] satisfies UIMessage['parts'];

    expect(getCitationSources(parts)).toEqual([
      {
        index: 1,
        title: 'Research Primer',
        url: 'https://example.edu/research',
      },
      {
        description: 'A review of learning science findings.',
        favicon: 'https://journal.example/favicon.ico',
        index: 2,
        title: 'Learning Science Review',
        url: 'https://journal.example/review',
      },
      {
        description: 'A source without Tavily favicon metadata.',
        favicon: 'https://fallback.example/favicon.ico',
        index: 3,
        title: 'Fallback favicon source',
        url: 'https://fallback.example/article',
      },
    ]);
  });

  it('turns numbered markers into grouped markdown links backed by collected sources', () => {
    const sources = [
      {
        index: 1,
        title: 'Research Primer',
        url: 'https://example.edu/research',
      },
      {
        index: 2,
        title: 'Learning Science Review',
        url: 'https://journal.example/review',
      },
    ];

    expect(
      buildInlineCitationMarkdown(
        'Retrieval practice improves recall [1, 2], but spacing matters [3].',
        sources
      )
    ).toBe(
      'Retrieval practice improves recall [[1, 2]](#citation-1-2 "Research Primer"), but spacing matters [3].'
    );
  });
});
