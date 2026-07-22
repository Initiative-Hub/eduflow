import { describe, expect, it } from 'vitest';
import {
  applyCourseContentSearchSourceEvent,
  createEmptyCourseContentSearchSources,
} from '@/lib/course-content/search-source-state';

describe('course content search source state', () => {
  it('accumulates web and youtube sources independently', () => {
    const webSource = {
      title: 'Reliable web reference',
      url: 'https://example.edu/reference',
      summary: 'Useful web context.',
    };
    const youtubeSource = {
      title: 'Relevant video',
      url: 'https://www.youtube.com/watch?v=abc123xyz00',
      summary: 'Useful video context.',
    };

    const empty = createEmptyCourseContentSearchSources();
    const withWeb = applyCourseContentSearchSourceEvent(empty, {
      type: 'source-found',
      sourceKind: 'web',
      source: webSource,
    });
    const withYoutube = applyCourseContentSearchSourceEvent(withWeb, {
      type: 'source-found',
      sourceKind: 'youtube',
      source: youtubeSource,
    });

    expect(empty.web).toEqual([]);
    expect(withYoutube.web).toEqual([webSource]);
    expect(withYoutube.youtube).toEqual([youtubeSource]);
  });

  it('deduplicates sources by kind and URL', () => {
    const source = {
      title: 'Original source title',
      url: 'https://example.edu/reference',
      summary: 'First summary.',
    };

    const state = applyCourseContentSearchSourceEvent(
      applyCourseContentSearchSourceEvent(
        createEmptyCourseContentSearchSources(),
        {
          type: 'source-found',
          sourceKind: 'web',
          source,
        }
      ),
      {
        type: 'source-found',
        sourceKind: 'web',
        source: { ...source, title: 'Duplicate title' },
      }
    );

    expect(state.web).toEqual([source]);
  });

  it('marks each source column complete without changing discovered sources', () => {
    const source = {
      title: 'Reliable web reference',
      url: 'https://example.edu/reference',
      summary: 'Useful web context.',
    };

    const withSource = applyCourseContentSearchSourceEvent(
      createEmptyCourseContentSearchSources(),
      {
        type: 'source-found',
        sourceKind: 'web',
        source,
      }
    );
    const complete = applyCourseContentSearchSourceEvent(withSource, {
      type: 'search-complete',
      sourceKind: 'web',
      count: 1,
    });

    expect(complete.web).toEqual([source]);
    expect(complete.completed.web).toBe(true);
    expect(complete.completed.youtube).toBe(false);
  });
});
