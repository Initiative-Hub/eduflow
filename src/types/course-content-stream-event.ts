/**
 * NDJSON event types emitted by the course content stream.
 * Each line in the response body is one JSON object matching one of these shapes.
 */

export type CourseContentSearchSourceKind = 'web' | 'youtube';

export type CourseContentSearchSourcePreview = {
  title: string;
  url: string;
  summary: string;
};

export type CourseContentStreamEvent =
  | { type: 'extract' }
  | { type: 'search' }
  | {
      type: 'source-found';
      sourceKind: CourseContentSearchSourceKind;
      source: CourseContentSearchSourcePreview;
    }
  | {
      type: 'search-complete';
      sourceKind: CourseContentSearchSourceKind;
      count: number;
    }
  | { type: 'search-skipped' }
  | { type: 'search-failed'; message: string }
  | { type: 'generate'; delta: string }
  | { type: 'save' }
  | { type: 'done' }
  | { type: 'error'; message: string };
