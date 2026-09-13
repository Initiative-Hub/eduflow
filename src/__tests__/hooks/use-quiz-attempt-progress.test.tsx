import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useQuizAttemptProgress } from '@/hooks/use-quiz-attempt-progress';
import type { QuizAttemptView } from '@/services/QuizAttemptService';

const mocks = vi.hoisted(() => ({
  save: vi.fn(),
  complete: vi.fn(),
  broadcast: vi.fn(),
  router: { push: vi.fn() },
}));
vi.mock('next/navigation', () => ({ useRouter: () => mocks.router }));
vi.mock('@/hooks/use-active-quiz-attempts', () => ({
  broadcastAttemptChange: mocks.broadcast,
}));
vi.mock('@/lib/api/api-client', () => ({
  apiClient: { patch: mocks.save, post: mocks.complete },
}));
const initial: QuizAttemptView = {
  id: 'attempt',
  quizId: 'quiz',
  courseId: 'course',
  status: 'IN_PROGRESS',
  revision: 3,
  quiz: {
    title: 'Quiz',
    description: '',
    type: 'true_false',
    questions: [
      { type: 'true_false', prompt: 'First' },
      { type: 'true_false', prompt: 'Second' },
    ],
  },
  deliveryMode: 'INSTANT_FEEDBACK',
  answers: { 0: { type: 'true_false', selectedAnswer: true } },
  currentQuestionIndex: 1,
  checkedQuestionIndices: [0],
  reviewQuestions: {
    0: { type: 'true_false', prompt: 'First', correctAnswer: true },
  },
  startedAt: '2026-09-13T00:00:00Z',
  completedAt: null,
  completionReason: null,
  answeredCount: 1,
  isLegacySnapshot: false,
  result: null,
};
function setup() {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  const onComplete = vi.fn();
  const hook = renderHook(() => useQuizAttemptProgress(initial, onComplete), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
  return { ...hook, onComplete };
}

describe('resumable quiz progress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it('restores position, answers and checked questions without starting again', () => {
    const { result } = setup();
    expect(result.current.currentIndex).toBe(1);
    expect(result.current.answers).toEqual(initial.answers);
    expect(result.current.attempt.checkedQuestionIndices).toEqual([0]);
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it('serializes overlapping saves before displaying the next question', async () => {
    let resolve!: (view: QuizAttemptView) => void;
    mocks.save.mockReturnValue(
      new Promise<QuizAttemptView>((done) => {
        resolve = done;
      })
    );
    const { result } = setup();
    let navigation!: Promise<void>;
    let overlappingFlush!: Promise<void>;
    act(() => {
      navigation = result.current.navigate(0);
      overlappingFlush = result.current.flush(0);
    });
    await waitFor(() => expect(mocks.save).toHaveBeenCalled());
    expect(mocks.save).toHaveBeenCalledOnce();
    expect(result.current.currentIndex).toBe(1);
    await act(async () => {
      resolve({ ...initial, revision: 4, currentQuestionIndex: 0 });
      await Promise.all([navigation, overlappingFlush]);
    });
    expect(mocks.save).toHaveBeenCalledOnce();
    expect(result.current.currentIndex).toBe(0);
  });
  it('flushes answers before completing and uses the acknowledged revision', async () => {
    mocks.save.mockImplementation(async (_id, input) => ({
      ...initial,
      ...input,
      revision: input.revision + 1,
    }));
    mocks.complete.mockResolvedValue({
      ...initial,
      status: 'COMPLETED',
      revision: 5,
    });
    const { result, onComplete } = setup();
    act(() =>
      result.current.answer({ type: 'true_false', selectedAnswer: false })
    );
    await act(async () => {
      await result.current.finish('ENDED_EARLY');
    });
    expect(mocks.save).toHaveBeenCalledWith(
      'v1/quiz-attempts/attempt',
      expect.objectContaining({
        revision: 3,
        answers: expect.objectContaining({
          1: { type: 'true_false', selectedAnswer: false },
        }),
      })
    );
    expect(mocks.complete).toHaveBeenCalledWith(
      'v1/quiz-attempts/attempt/complete',
      {
        revision: 4,
        completionReason: 'ENDED_EARLY',
      }
    );
    expect(onComplete).toHaveBeenCalledOnce();
    expect(mocks.broadcast).toHaveBeenCalledOnce();
  });
  it('preserves unsaved answers after failure and retries explicitly', async () => {
    mocks.save
      .mockRejectedValueOnce({ status: 500, message: 'Offline' })
      .mockImplementation(async (_id, input) => ({
        ...initial,
        ...input,
        revision: input.revision + 1,
      }));
    const { result } = setup();
    act(() =>
      result.current.answer({ type: 'true_false', selectedAnswer: false })
    );
    await act(async () => {
      await result.current.flush().catch(() => undefined);
    });
    expect(result.current.dirty).toBe(true);
    expect(result.current.error).toBeTruthy();
    await act(async () => {
      await result.current.retry();
    });
    expect(result.current.dirty).toBe(false);
    expect(result.current.answers[1]).toEqual({
      type: 'true_false',
      selectedAnswer: false,
    });
  });
});
