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
            },
            {
              title: 'Duplicate should be skipped',
              url: 'https://example.edu/research',
              content: 'Already emitted as a source part.',
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
        index: 2,
        title: 'Learning Science Review',
        url: 'https://journal.example/review',
      },
    ]);
  });

  it('turns numbered markers into markdown links backed by collected sources', () => {
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
      'Retrieval practice improves recall [[1]](https://example.edu/research "Research Primer") [[2]](https://journal.example/review "Learning Science Review"), but spacing matters [3].'
    );
  });
});
