'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient } from '@/lib/api/api-client';
import type { StudentAnswer } from '@/lib/quiz-template';
import { AttemptSaveQueue } from '@/lib/quiz-template/attempt-save-queue';
import type {
  AttemptCheck,
  AttemptComplete,
  AttemptProgress,
} from '@/lib/validations/quiz-attempt.schema';
import type { QuizAttemptView } from '@/services/QuizAttemptService';
import { broadcastAttemptChange } from './use-active-quiz-attempts';

function isAttemptConflict(error: unknown) {
  return (
    !!error &&
    typeof error === 'object' &&
    'status' in error &&
    error.status === 409
  );
}

export function useQuizAttemptProgress(
  initial: QuizAttemptView,
  onComplete: (attempt: QuizAttemptView) => void
) {
  const router = useRouter();
  const [attempt, setAttempt] = useState(initial);
  const server = useRef(initial);
  const [answers, setAnswers] = useState(initial.answers);
  const draft = useRef(initial.answers);
  const [currentIndex, setCurrentIndex] = useState(
    initial.currentQuestionIndex
  );
  const indexRef = useRef(initial.currentQuestionIndex);
  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queue = useRef(new AttemptSaveQueue());
  const save = useMutation({
    mutationFn: (input: AttemptProgress) =>
      apiClient.patch<QuizAttemptView>(`v1/quiz-attempts/${initial.id}`, input),
  });
  const check = useMutation({
    mutationFn: (input: AttemptCheck) =>
      apiClient.post<QuizAttemptView>(
        `v1/quiz-attempts/${initial.id}/check`,
        input
      ),
  });
  const complete = useMutation({
    mutationFn: (input: AttemptComplete) =>
      apiClient.post<QuizAttemptView>(
        `v1/quiz-attempts/${initial.id}/complete`,
        input
      ),
  });

  const updateServer = useCallback((next: QuizAttemptView) => {
    server.current = next;
    setAttempt(next);
  }, []);
  const cancelTimer = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);
  const flush = useCallback(
    async (targetIndex?: number) => {
      cancelTimer();
      try {
        await queue.current.run(async () => {
          const position = targetIndex ?? indexRef.current;
          if (
            !dirtyRef.current &&
            position === server.current.currentQuestionIndex
          )
            return;
          const snapshot = draft.current;
          const next = await save.mutateAsync({
            answers: snapshot,
            currentQuestionIndex: position,
            revision: server.current.revision,
          });
          updateServer(next);
          if (snapshot === draft.current) {
            dirtyRef.current = false;
            setDirty(false);
          }
        });
        setError(null);
      } catch (failure) {
        setError(failure);
        throw failure;
      }
    },
    [cancelTimer, save.mutateAsync, updateServer]
  );

  const answer = (value: StudentAnswer) => {
    if (server.current.checkedQuestionIndices.includes(indexRef.current))
      return;
    draft.current = { ...draft.current, [indexRef.current]: value };
    setAnswers(draft.current);
    dirtyRef.current = true;
    setDirty(true);
    cancelTimer();
    timer.current = setTimeout(() => {
      void flush().catch(() => undefined);
    }, 400);
  };
  const navigate = async (index: number) => {
    setBusy(true);
    try {
      await flush(index);
      indexRef.current = index;
      setCurrentIndex(index);
    } catch {
      /* Flush exposes a retryable error. */
    } finally {
      setBusy(false);
    }
  };
  const checkAnswer = async () => {
    setBusy(true);
    try {
      await flush();
      await queue.current.run(async () =>
        updateServer(
          await check.mutateAsync({
            revision: server.current.revision,
            questionIndex: indexRef.current,
            answer: draft.current[indexRef.current],
          })
        )
      );
    } catch (failure) {
      setError(failure);
    } finally {
      setBusy(false);
    }
  };
  const finish = async (completionReason: 'SUBMITTED' | 'ENDED_EARLY') => {
    setBusy(true);
    try {
      await flush();
      const result = await queue.current.run(() =>
        complete.mutateAsync({
          revision: server.current.revision,
          completionReason,
        })
      );
      updateServer(result);
      broadcastAttemptChange();
      onComplete(result);
    } catch (failure) {
      setError(failure);
    } finally {
      setBusy(false);
    }
  };
  const retry = async () => {
    queue.current.retry();
    await flush().catch(() => undefined);
  };

  // Flush same-tab link navigation before Next.js handles the click. A hard close
  // can only resume the last acknowledged save; do not pretend unload is reliable.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (
        !dirtyRef.current ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const anchor =
        event.target instanceof Element ? event.target.closest('a') : null;
      if (
        !anchor ||
        anchor.target === '_blank' ||
        anchor.hasAttribute('download')
      )
        return;
      const url = new URL(anchor.href, window.location.href);
      if (
        url.origin !== window.location.origin ||
        url.href === window.location.href
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      void flush()
        .then(() => router.push(`${url.pathname}${url.search}${url.hash}`))
        .catch(() => undefined);
    };
    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      cancelTimer();
    };
  }, [cancelTimer, flush, router]);

  return {
    attempt,
    answers,
    currentIndex,
    dirty,
    error,
    conflict: isAttemptConflict(error),
    busy,
    saving: save.isPending,
    answer,
    navigate,
    checkAnswer,
    finish,
    retry,
    flush,
  };
}
