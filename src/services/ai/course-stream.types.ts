/**
 * NDJSON event types emitted by the course generation stream.
 * Each line in the response body is one JSON object matching one of these shapes.
 */

export type CourseStreamEvent =
  | { type: 'extract' }
  | { type: 'search' }
  | { type: 'generate'; delta: string }
  | { type: 'save' }
  | { type: 'done' }
  | { type: 'error'; message: string };
