'use client';

import { useMutation } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';
import {
  applyCourseContentPipelineEvent,
  type CourseContentPipelineState,
  type CourseContentPipelineStep,
  createCourseContentPipelineState,
} from '@/lib/course-content/pipeline-state';
import {
  applyCourseContentSearchSourceEvent,
  type CourseContentSearchSourcesState,
  createEmptyCourseContentSearchSources,
} from '@/lib/course-content/search-source-state';
import type { CourseContentStreamEvent } from '@/types/course-content-stream-event';

export type GenerationStep =
  | 'extract'
  | 'search'
  | 'generate'
  | 'save'
  | 'done'
  | 'idle'
  | 'error';

export type GenerationPipelineStep = CourseContentPipelineStep;
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
  pipelineState: CourseContentPipelineState;
  courseContentDraft: CourseContentDraft | null;
  searchSources: CourseContentSearchSourcesState;
  searchFailureMessage: string | null;
  isSearchSkipAvailable: boolean;
  isSearchSkipRequested: boolean;
  searchSkipError: string | null;
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
  skipSearch: () => Promise<void>;
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
  const [pipelineState, setPipelineState] =
    useState<CourseContentPipelineState>(() =>
      createCourseContentPipelineState()
    );
  const [courseContentDraft, setCourseContentDraft] =
    useState<CourseContentDraft | null>(null);
  const [searchSources, setSearchSources] =
    useState<CourseContentSearchSourcesState>(() =>
      createEmptyCourseContentSearchSources()
    );
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchFailureMessage, setSearchFailureMessage] = useState<
    string | null
  >(null);
  const [controlId, setControlId] = useState<string | null>(null);
  const [isSearchSkipRequested, setIsSearchSkipRequested] = useState(false);
  const [searchSkipError, setSearchSkipError] = useState<string | null>(null);

  // Accumulate raw JSON delta text from the AI
  const deltaBufferRef = useRef('');

  const skipSearchMutation = useMutation({
    mutationFn: async (generationControlId: string) => {
      const response = await fetch(
        `/api/v1/ai/courses/${generationControlId}/skip-search`,
        {
          method: 'POST',
          cache: 'no-store',
          credentials: 'include',
        }
      );
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
    },
  });

  const reset = useCallback(() => {
    setStep('idle');
    setLastStartedStep(null);
    setPipelineState(createCourseContentPipelineState());
    setCourseContentDraft(null);
    setSearchSources(createEmptyCourseContentSearchSources());
    setIsRunning(false);
    setError(null);
    setSearchFailureMessage(null);
    setControlId(null);
    setIsSearchSkipRequested(false);
    setSearchSkipError(null);
    skipSearchMutation.reset();
    deltaBufferRef.current = '';
  }, [skipSearchMutation]);

  const skipSearch = useCallback(async () => {
    if (!controlId) return;

    setSearchSkipError(null);
    try {
      await skipSearchMutation.mutateAsync(controlId);
      setIsSearchSkipRequested(true);
    } catch (skipError) {
      const message =
        skipError instanceof Error
          ? skipError.message
          : 'Unable to skip search';
      setSearchSkipError(message);
      throw skipError;
    }
  }, [controlId, skipSearchMutation]);

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

        setControlId(
          response.headers.get('X-Course-Content-Generation-Control')
        );

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
                setPipelineState((current) =>
                  applyCourseContentPipelineEvent(current, event)
                );
                break;
              case 'search':
                setStep('search');
                setLastStartedStep('search');
                setPipelineState((current) =>
                  applyCourseContentPipelineEvent(current, event)
                );
                break;
              case 'source-found':
              case 'search-complete':
                setSearchSources((current) =>
                  applyCourseContentSearchSourceEvent(current, event)
                );
                break;
              case 'search-skipped':
                setIsSearchSkipRequested(false);
                setPipelineState((current) =>
                  applyCourseContentPipelineEvent(current, event)
                );
                break;
              case 'search-failed':
                setSearchFailureMessage(event.message);
                setPipelineState((current) =>
                  applyCourseContentPipelineEvent(current, event)
                );
                break;
              case 'generate':
                setStep('generate');
                setLastStartedStep('generate');
                setPipelineState((current) =>
                  applyCourseContentPipelineEvent(current, event)
                );
                deltaBufferRef.current += event.delta;
                setCourseContentDraft(
                  parseCourseContentDraft(deltaBufferRef.current)
                );
                break;
              case 'save':
                setStep('save');
                setLastStartedStep('save');
                setPipelineState((current) =>
                  applyCourseContentPipelineEvent(current, event)
                );
                break;
              case 'done':
                setStep('done');
                setPipelineState((current) =>
                  applyCourseContentPipelineEvent(current, event)
                );
                break;
              case 'error':
                setPipelineState((current) =>
                  applyCourseContentPipelineEvent(current, event)
                );
                throw new Error(event.message);
            }
          }
        }

        onSuccess?.();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        setError(msg);
        setStep('error');
        setPipelineState((current) =>
          applyCourseContentPipelineEvent(current, {
            type: 'error',
            message: msg,
          })
        );
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
    pipelineState,
    courseContentDraft,
    searchSources,
    searchFailureMessage,
    isSearchSkipAvailable: Boolean(controlId),
    isSearchSkipRequested:
      isSearchSkipRequested || skipSearchMutation.isPending,
    searchSkipError,
    isRunning,
    error,
    generateCourseContent,
    skipSearch,
    reset,
  };
}
