'use client';

import { useCallback, useRef, useState } from 'react';
import {
  applySearchSourceEvent,
  createEmptySearchSources,
  type SearchSourcesState,
} from '@/lib/course-generation/stream-state';
import type { CourseStreamEvent } from '@/types/course-stream-event';

export type GenerationStep =
  | 'extract'
  | 'search'
  | 'generate'
  | 'save'
  | 'done'
  | 'idle'
  | 'error';

export interface StreamingModule {
  title?: string;
  lessons?: Array<{ lessonTitle?: string }>;
}

export interface StreamingCourse {
  courseTitle?: string;
  modules?: StreamingModule[];
}

export interface UseGenerateCourseReturn {
  step: GenerationStep;
  streamingCourse: StreamingCourse | null;
  searchSources: SearchSourcesState;
  isRunning: boolean;
  error: string | null;
  generate: (params: {
    courseId: string;
    fileId?: string;
    file?: File;
    context?: string;
    apiKey?: string;
    model?: string;
  }) => Promise<void>;
  reset: () => void;
}

/**
 * Reads the NDJSON course-generation stream from /api/v1/ai/courses and
 * exposes real-time step + partial course object to the UI.
 */
export function useGenerateCourse(
  onSuccess?: () => void,
  onError?: (msg: string) => void
): UseGenerateCourseReturn {
  const [step, setStep] = useState<GenerationStep>('idle');
  const [streamingCourse, setStreamingCourse] =
    useState<StreamingCourse | null>(null);
  const [searchSources, setSearchSources] = useState<SearchSourcesState>(() =>
    createEmptySearchSources()
  );
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Accumulate raw JSON delta text from the AI
  const deltaBufferRef = useRef('');

  const reset = useCallback(() => {
    setStep('idle');
    setStreamingCourse(null);
    setSearchSources(createEmptySearchSources());
    setIsRunning(false);
    setError(null);
    deltaBufferRef.current = '';
  }, []);

  /**
   * Attempt to parse the accumulated delta buffer as partial JSON and extract
   * a best-effort StreamingCourse for live preview.
   */
  const tryParseDelta = useCallback((raw: string): StreamingCourse => {
    // Extract courseTitle
    const titleMatch = raw.match(/"courseTitle"\s*:\s*"([^"]*)"/);
    const courseTitle = titleMatch?.[1];

    // Extract module titles and their lesson titles
    const modules: StreamingModule[] = [];
    const moduleRegex = /"title"\s*:\s*"([^"]*)"/g;
    const lessonRegex = /"lessonTitle"\s*:\s*"([^"]*)"/g;

    // Simple heuristic: find all title/lessonTitle pairs in order
    const titles = Array.from(raw.matchAll(moduleRegex)).map((m) => m[1]);
    const lessonTitles = Array.from(raw.matchAll(lessonRegex)).map((m) => m[1]);

    // Group: each module title gets the lessons that follow it
    // (rough approximation — good enough for live preview)
    for (let i = 0; i < titles.length; i++) {
      modules.push({ title: titles[i], lessons: [] });
    }
    lessonTitles.forEach((lt, idx) => {
      const modIdx = Math.min(Math.floor(idx / 3), modules.length - 1);
      if (modules[modIdx]) {
        modules[modIdx].lessons = [
          ...(modules[modIdx].lessons ?? []),
          { lessonTitle: lt },
        ];
      }
    });

    return { courseTitle, modules };
  }, []);

  const generate = useCallback(
    async (params: {
      courseId: string;
      fileId?: string;
      file?: File;
      context?: string;
      apiKey?: string;
      model?: string;
    }) => {
      reset();
      setIsRunning(true);
      deltaBufferRef.current = '';

      try {
        let body: BodyInit;
        let headers: HeadersInit = {};

        if (params.file) {
          const fd = new FormData();
          fd.append('courseId', params.courseId);
          fd.append('file', params.file);
          if (params.context) fd.append('context', params.context);
          if (params.apiKey) fd.append('apiKey', params.apiKey);
          if (params.model) fd.append('model', params.model);
          body = fd;
        } else {
          body = JSON.stringify({
            courseId: params.courseId,
            fileId: params.fileId,
            context: params.context,
            apiKey: params.apiKey,
            model: params.model,
          });
          headers = { 'Content-Type': 'application/json' };
        }

        const response = await fetch('/api/v1/ai/courses', {
          method: 'POST',
          headers,
          body,
          credentials: 'include',
        });

        if (!response.ok || !response.body) {
          throw new Error(`HTTP ${response.status}`);
        }

        const reader = response.body
          .pipeThrough(new TextDecoderStream())
          .getReader();
        let lineBuffer = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          lineBuffer += value;
          const lines = lineBuffer.split('\n');
          lineBuffer = lines.pop() ?? '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            let event: CourseStreamEvent;
            try {
              event = JSON.parse(trimmed) as CourseStreamEvent;
            } catch {
              continue;
            }

            switch (event.type) {
              case 'extract':
                setStep('extract');
                break;
              case 'search':
                setStep('search');
                break;
              case 'source-found':
              case 'search-complete':
                setSearchSources((current) =>
                  applySearchSourceEvent(current, event)
                );
                break;
              case 'generate':
                setStep('generate');
                deltaBufferRef.current += event.delta;
                setStreamingCourse(tryParseDelta(deltaBufferRef.current));
                break;
              case 'save':
                setStep('save');
                break;
              case 'done':
                setStep('done');
                break;
              case 'error':
                throw new Error(event.message);
            }
          }
        }

        onSuccess?.();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        setError(msg);
        setStep('error');
        onError?.(msg);
      } finally {
        setIsRunning(false);
      }
    },
    [reset, tryParseDelta, onSuccess, onError]
  );

  return {
    step,
    streamingCourse,
    searchSources,
    isRunning,
    error,
    generate,
    reset,
  };
}
