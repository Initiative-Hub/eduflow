import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement, ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { DeleteQuizDialog } from '@/app/[locale]/(dashboard)/courses/[courseId]/_components/delete-quiz-dialog';
import type { QuizDefinition } from '@/lib/quiz-template';

const deleteQuiz = vi.hoisted(() => vi.fn());

vi.mock('next-intl', () => ({
  useTranslations:
    () => (key: string, values?: Record<string, string | number>) => {
      const messages: Record<string, string> = {
        cancel: 'Cancel',
        confirm: 'Delete quiz',
        deleting: 'Deleting...',
        description: 'Delete {title}?',
        error: 'Failed to delete quiz',
        success: 'Quiz deleted',
        title: 'Delete this quiz?',
        trigger: 'Delete quiz',
      };
      let message = messages[key] ?? key;
      for (const [name, value] of Object.entries(values ?? {})) {
        message = message.replaceAll(`{${name}}`, String(value));
      }
      return message;
    },
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('@/components/custom/dialog', () => ({
  ConfirmDialog: ({
    confirmLabel,
    onConfirm,
    trigger,
  }: {
    confirmLabel: ReactNode;
    onConfirm: (controls: { close: () => void }) => void;
    trigger: ReactElement;
  }) => (
    <div>
      {trigger}
      <button type="button" onClick={() => onConfirm({ close: vi.fn() })}>
        {confirmLabel}
      </button>
    </div>
  ),
}));

vi.mock(
  '@/app/[locale]/(dashboard)/courses/[courseId]/(course-tabs)/quiz/quiz.service',
  () => ({
    quizService: {
      deleteQuiz,
    },
  })
);

describe('DeleteQuizDialog', () => {
  it('removes the deleted quiz from the cached accordion quiz list', async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    const quizzes: QuizDefinition[] = [
      {
        courseId: 'course-1',
        createdAt: '2026-07-13T00:00:00.000Z',
        deliveryMode: 'POST_QUIZ_REVIEW',
        description: '',
        lessonIds: ['lesson-1'],
        questionCount: 1,
        questionCounts: {},
        questions: [],
        selectionMethod: 'MANUAL_CREATE',
        title: 'Keep quiz',
        updatedAt: '2026-07-13T00:00:00.000Z',
        id: 'quiz-keep',
      },
      {
        courseId: 'course-1',
        createdAt: '2026-07-13T00:00:00.000Z',
        deliveryMode: 'POST_QUIZ_REVIEW',
        description: '',
        lessonIds: ['lesson-1'],
        questionCount: 1,
        questionCounts: {},
        questions: [],
        selectionMethod: 'MANUAL_CREATE',
        title: 'Delete me',
        updatedAt: '2026-07-13T00:00:00.000Z',
        id: 'quiz-delete',
      },
    ];
    queryClient.setQueryData(['quizzes', 'course-1'], quizzes);
    deleteQuiz.mockResolvedValue(undefined);

    render(
      <QueryClientProvider client={queryClient}>
        <DeleteQuizDialog
          courseId="course-1"
          quizId="quiz-delete"
          quizTitle="Delete me"
        />
      </QueryClientProvider>
    );

    await user.click(screen.getAllByRole('button', { name: 'Delete quiz' })[1]);

    await waitFor(() => {
      expect(
        queryClient
          .getQueryData<QuizDefinition[]>(['quizzes', 'course-1'])
          ?.map((quiz) => quiz.id)
      ).toEqual(['quiz-keep']);
    });
  });
});
