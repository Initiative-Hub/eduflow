import type {
  CourseSearchSourceKind,
  CourseSearchSourcePreview,
  CourseStreamEvent,
} from '@/types/course-stream-event';

export type SearchSourcesState = {
  web: CourseSearchSourcePreview[];
  youtube: CourseSearchSourcePreview[];
  completed: Record<CourseSearchSourceKind, boolean>;
};

export function createEmptySearchSources(): SearchSourcesState {
  return {
    web: [],
    youtube: [],
    completed: {
      web: false,
      youtube: false,
    },
  };
}

export function applySearchSourceEvent(
  state: SearchSourcesState,
  event: Extract<
    CourseStreamEvent,
    { type: 'source-found' | 'search-complete' }
  >
): SearchSourcesState {
  if (event.type === 'search-complete') {
    return {
      ...state,
      completed: {
        ...state.completed,
        [event.sourceKind]: true,
      },
    };
  }

  const sources = state[event.sourceKind];

  if (sources.some((source) => source.url === event.source.url)) {
    return state;
  }

  return {
    ...state,
    [event.sourceKind]: [...sources, event.source],
  };
}
