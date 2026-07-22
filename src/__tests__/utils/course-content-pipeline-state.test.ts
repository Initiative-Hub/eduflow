import { describe, expect, it } from 'vitest';
import {
  applyCourseContentPipelineEvent,
  createCourseContentPipelineState,
} from '@/lib/course-content/pipeline-state';

describe('course content pipeline state', () => {
  it('preserves a skipped search outcome when content generation starts', () => {
    const extracting = applyCourseContentPipelineEvent(
      createCourseContentPipelineState(),
      { type: 'extract' }
    );
    const searching = applyCourseContentPipelineEvent(extracting, {
      type: 'search',
    });
    const skipped = applyCourseContentPipelineEvent(searching, {
      type: 'search-skipped',
    });
    const generating = applyCourseContentPipelineEvent(skipped, {
      type: 'generate',
      delta: '',
    });

    expect(generating).toEqual({
      extract: 'completed',
      search: 'skipped',
      generate: 'running',
      save: 'pending',
    });
  });

  it('preserves a failed search outcome when content generation starts', () => {
    const failed = applyCourseContentPipelineEvent(
      applyCourseContentPipelineEvent(createCourseContentPipelineState(), {
        type: 'search',
      }),
      { type: 'search-failed', message: 'Provider unavailable' }
    );
    const generating = applyCourseContentPipelineEvent(failed, {
      type: 'generate',
      delta: '',
    });

    expect(generating.search).toBe('failed');
    expect(generating.generate).toBe('running');
  });
});
