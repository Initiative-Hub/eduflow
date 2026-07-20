'use client';

import { useCallback, useRef, useState } from 'react';
import {
  applyCourseContentSearchSourceEvent,
  type CourseContentSearchSourcesState,
  createEmptyCourseContentSearchSources,
} from '@/lib/course-content/stream-state';
import type { CourseContentStreamEvent } from '@/types/course-content-stream-event';

export type GenerationStep =
  | 'extract'
  | 'search'
  | 'generate'
  | 'save'
  | 'done'
  | 'idle'
  | 'error';

export type GenerationPipelineStep = 'extract' | 'search' | 'generate' | 'save';
export interface CourseContentModuleDraft {
  title?: string;
  lessons?: Array<{ lessonTitle?: string }>;
}

export interface CourseContentDraft {
  courseTitle?: string;
  modules?: CourseContentModuleDraft[];
}

export interface UseGenerateCourseContentReturn {
  step: GenerationStep;
  lastStartedStep: GenerationPipelineStep | null;
  courseContentDraft: CourseContentDraft | null;
  searchSources: CourseContentSearchSourcesState;
  isRunning: boolean;
  error: string | null;
  generateCourseContent: (params: {
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
 * Reads the NDJSON course-content stream from /api/v1/ai/courses and
 * exposes the real-time pipeline step and content draft to the UI.
 */
export function useGenerateCourseContent(
  onSuccess?: () => void,
  onError?: (msg: string) => void
): UseGenerateCourseContentReturn {
  const [step, setStep] = useState<GenerationStep>('idle');
  const [lastStartedStep, setLastStartedStep] =
    useState<GenerationPipelineStep | null>(null);
  const [courseContentDraft, setCourseContentDraft] =
    useState<CourseContentDraft | null>(null);
  const [searchSources, setSearchSources] =
    useState<CourseContentSearchSourcesState>(() =>
      createEmptyCourseContentSearchSources()
    );
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Accumulate raw JSON delta text from the AI
  const deltaBufferRef = useRef('');

  const reset = useCallback(() => {
    setStep('idle');
    setLastStartedStep(null);
    setCourseContentDraft(null);
    setSearchSources(createEmptyCourseContentSearchSources());
    setIsRunning(false);
    setError(null);
    deltaBufferRef.current = '';
  }, []);

  /**
   * Attempt to parse the accumulated delta buffer as partial JSON and extract
   * a best-effort CourseContentDraft for live preview.
   */
  const parseCourseContentDraft = useCallback(
    (raw: string): CourseContentDraft => {
      // Extract courseTitle
      const titleMatch = raw.match(/"courseTitle"\s*:\s*"([^"]*)"/);
      const courseTitle = titleMatch?.[1];

      // Extract module titles and their lesson titles
      const modules: CourseContentModuleDraft[] = [];
      const moduleRegex = /"title"\s*:\s*"([^"]*)"/g;
      const lessonRegex = /"lessonTitle"\s*:\s*"([^"]*)"/g;

      // Simple heuristic: find all title/lessonTitle pairs in order
      const titles = Array.from(raw.matchAll(moduleRegex)).map((m) => m[1]);
      const lessonTitles = Array.from(raw.matchAll(lessonRegex)).map(
        (m) => m[1]
      );

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
    },
    []
  );

  const generateCourseContent = useCallback(
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

            let event: CourseContentStreamEvent;
            try {
              event = JSON.parse(trimmed) as CourseContentStreamEvent;
            } catch {
              continue;
            }

            switch (event.type) {
              case 'extract':
                setStep('extract');
                setLastStartedStep('extract');
                break;
              case 'search':
                setStep('search');
                setLastStartedStep('search');
                break;
              case 'source-found':
              case 'search-complete':
                setSearchSources((current) =>
                  applyCourseContentSearchSourceEvent(current, event)
                );
                break;
              case 'generate':
                setStep('generate');
                setLastStartedStep('generate');
                deltaBufferRef.current += event.delta;
                setCourseContentDraft(
                  parseCourseContentDraft(deltaBufferRef.current)
                );
                break;
              case 'save':
                setStep('save');
                setLastStartedStep('save');
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
    [reset, parseCourseContentDraft, onSuccess, onError]
  );

  return {
    step,
    lastStartedStep,
    courseContentDraft,
    searchSources,
    isRunning,
    error,
    generateCourseContent,
    reset,
  };
}
