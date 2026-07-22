import type { CourseContentStreamEvent } from '@/types/course-content-stream-event';

export type CourseContentPipelineStep =
  | 'extract'
  | 'search'
  | 'generate'
  | 'save';
export type CourseContentPipelineStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'skipped'
  | 'failed';

export type CourseContentPipelineState = Record<
  CourseContentPipelineStep,
  CourseContentPipelineStatus
>;

export function createCourseContentPipelineState(): CourseContentPipelineState {
  return {
    extract: 'pending',
    search: 'pending',
    generate: 'pending',
    save: 'pending',
  };
}

export function applyCourseContentPipelineEvent(
  state: CourseContentPipelineState,
  event: CourseContentStreamEvent
): CourseContentPipelineState {
  switch (event.type) {
    case 'extract':
      return { ...state, extract: 'running' };
    case 'search':
      return { ...state, extract: 'completed', search: 'running' };
    case 'search-skipped':
      return { ...state, search: 'skipped' };
    case 'search-failed':
      return { ...state, search: 'failed' };
    case 'generate':
      return {
        ...state,
        extract: 'completed',
        search: state.search === 'running' ? 'completed' : state.search,
        generate: 'running',
      };
    case 'save':
      return { ...state, generate: 'completed', save: 'running' };
    case 'done':
      return {
        ...state,
        extract: 'completed',
        search: state.search === 'running' ? 'completed' : state.search,
        generate: 'completed',
        save: 'completed',
      };
    case 'error': {
      const activeStep = (
        Object.keys(state) as CourseContentPipelineStep[]
      ).find((step) => state[step] === 'running');
      return activeStep ? { ...state, [activeStep]: 'failed' } : state;
    }
    default:
      return state;
  }
}
