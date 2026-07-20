import type {
  CourseContentSearchSourceKind,
  CourseContentSearchSourcePreview,
  CourseContentStreamEvent,
} from '@/types/course-content-stream-event';

export type CourseContentSearchSourcesState = {
  web: CourseContentSearchSourcePreview[];
  youtube: CourseContentSearchSourcePreview[];
  completed: Record<CourseContentSearchSourceKind, boolean>;
};

export function createEmptyCourseContentSearchSources(): CourseContentSearchSourcesState {
  return {
    web: [],
    youtube: [],
    completed: {
      web: false,
      youtube: false,
    },
  };
}

export function applyCourseContentSearchSourceEvent(
  state: CourseContentSearchSourcesState,
  event: Extract<
    CourseContentStreamEvent,
    { type: 'source-found' | 'search-complete' }
  >
): CourseContentSearchSourcesState {
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
