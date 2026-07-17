import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CreateQuizClient } from '@/app/[locale]/(dashboard)/courses/[courseId]/(course-tabs)/quiz/create/create-quiz-client';
import { QuizAiDraftDialog } from '@/app/[locale]/(dashboard)/courses/[courseId]/(course-tabs)/quiz/create/quiz-ai-draft-dialog';
import { QuizQuestionsEditor } from '@/components/quiz/editors/quiz-questions-editor';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/app/[locale]/(dashboard)/courses/[courseId]/use-modules', () => ({
  useModules: () => ({
    modules: [
      {
        id: 'module-1',
        title: 'Module one',
        lessons: [{ id: 'lesson-1', title: 'Lesson one' }],
      },
    ],
  }),
}));

vi.mock(
  '@/app/[locale]/(dashboard)/courses/[courseId]/use-question-bank',
  () => ({
    useQuestionBank: () => ({
      questions: [],
      createQuiz: vi.fn(),
      isCreatingQuiz: false,
    }),
  })
);

describe('CreateQuizClient', () => {
  it('keeps quiz details and all three question sources on one page', () => {
    render(<CreateQuizClient courseId="course-1" />);

    expect(screen.getByLabelText('quizTitle')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /methods\.ai\.title/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /methods\.manual\.title/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /methods\.question-bank\.title/ })
    ).toBeInTheDocument();
  });

  it('keeps appended AI questions in the draft until save', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <QuizQuestionsEditor
        initialQuestions={[]}
        onGenerateAI={(appendQuestions) =>
          appendQuestions([
            {
              type: 'true_false',
              prompt: 'Draft question',
              correctAnswer: true,
            },
          ])
        }
        onSave={onSave}
        creationMode
      />
    );

    await user.click(
      screen.getByRole('button', { name: /methods\.ai\.title/ })
    );
    expect(screen.getByText('Draft question')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'saveQuiz' }));
    expect(onSave).toHaveBeenCalledWith(
      [
        {
          type: 'true_false',
          prompt: 'Draft question',
          correctAnswer: true,
        },
      ],
      [null]
    );
  });

  it('uses established message keys in the AI draft dialog', () => {
    render(
      <QuizAiDraftDialog
        open
        onOpenChange={vi.fn()}
        isGenerating={false}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByText('aiGenerate')).toBeInTheDocument();
    expect(screen.getByText('aiGenerateDescription')).toBeInTheDocument();
    expect(screen.getByLabelText('aiContextLabel')).toHaveAttribute(
      'placeholder',
      'aiContextPlaceholder'
    );
    expect(
      screen.getByRole('button', { name: 'generate' })
    ).toBeInTheDocument();
  });
});
