import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateQuizClient } from '@/app/[locale]/(dashboard)/courses/[courseId]/(course-tabs)/quiz/create/create-quiz-client';
import { QuizAiDraftDialog } from '@/app/[locale]/(dashboard)/courses/[courseId]/(course-tabs)/quiz/create/quiz-ai-draft-dialog';
import { QuizQuestionsEditor } from '@/components/quiz/editors/quiz-questions-editor';
import enMessages from '../../../messages/en.json';

const mocks = vi.hoisted(() => ({
  createQuiz: vi.fn(),
  generateDraftQuiz: vi.fn(),
  routerPush: vi.fn(),
}));

function getMessage(namespace: string, key: string) {
  const path = `${namespace}.${key}`.split('.');
  let current: unknown = enMessages;

  for (const part of path) {
    if (typeof current !== 'object' || current === null || !(part in current)) {
      return key;
    }

    current = (current as Record<string, unknown>)[part];
  }

  return typeof current === 'string' ? current : key;
}

vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string) =>
    getMessage(namespace, key),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.routerPush }),
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
      createQuiz: mocks.createQuiz,
      isCreatingQuiz: false,
      generateDraftQuiz: mocks.generateDraftQuiz,
      isGeneratingDraftQuiz: false,
    }),
  })
);

describe('CreateQuizClient', () => {
  beforeEach(() => {
    Object.defineProperties(HTMLElement.prototype, {
      hasPointerCapture: {
        configurable: true,
        value: vi.fn(() => false),
      },
      releasePointerCapture: {
        configurable: true,
        value: vi.fn(),
      },
      setPointerCapture: {
        configurable: true,
        value: vi.fn(),
      },
      scrollIntoView: {
        configurable: true,
        value: vi.fn(),
      },
    });
    mocks.createQuiz.mockReset();
    mocks.generateDraftQuiz.mockReset();
    mocks.routerPush.mockReset();
  });

  it('keeps quiz details and all three question sources on one page', () => {
    render(<CreateQuizClient courseId="course-1" />);

    expect(screen.getByLabelText('Quiz Title')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Create with AI/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Add questions manually/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Add from question bank/ })
    ).toBeInTheDocument();
  });

  it('renders corrected title and optional detail labels', () => {
    render(<CreateQuizClient courseId="course-1" />);

    expect(screen.getByLabelText('Quiz Title')).toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
    expect(
      screen.queryByText('Description (optional)')
    ).not.toBeInTheDocument();
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

    await user.click(screen.getByRole('button', { name: /Create with AI/ }));
    expect(screen.getByText('Draft question')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Save quiz' }));
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

  it('redirects to the created quiz edit page after saving', async () => {
    const user = userEvent.setup();
    render(<CreateQuizClient courseId="course-1" />);

    await user.type(screen.getByLabelText('Quiz Title'), 'Module review');
    await user.click(screen.getByRole('checkbox', { name: 'Lesson one' }));
    await user.click(screen.getByRole('button', { name: 'Save quiz' }));

    expect(mocks.createQuiz).toHaveBeenCalledTimes(1);

    const [, options] = mocks.createQuiz.mock.calls[0];
    options.onSuccess({ id: 'quiz-123' });

    expect(mocks.routerPush).toHaveBeenCalledWith(
      '/courses/course-1/quiz/quiz-123?tab=edit'
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

    expect(screen.getByText('AI Question Generation')).toBeInTheDocument();
    expect(
      screen.getByText(
        'AI will generate questions from the selected lesson content and open the quiz for review.'
      )
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Context')).toHaveAttribute(
      'placeholder',
      'Example: Focus on lesson 3, include more scenario-based questions, medium difficulty...'
    );
    expect(
      screen.getByRole('button', { name: 'Generate' })
    ).toBeInTheDocument();
  });

  it('clears the AI draft dialog only when the success reset key changes', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const { rerender } = render(
      <QuizAiDraftDialog
        open
        onOpenChange={vi.fn()}
        isGenerating={false}
        resetKey={0}
        onSubmit={onSubmit}
      />
    );

    await user.click(
      screen.getByRole('combobox', { name: 'Question Category' })
    );
    await user.click(
      await screen.findByRole('option', { name: 'Selection-based' })
    );
    await user.type(screen.getByLabelText('Multiple Choice'), '3');
    await user.type(screen.getByLabelText('Context'), 'Focus on lesson 3');

    expect(screen.getByLabelText('Multiple Choice')).toHaveValue(3);
    expect(screen.getByLabelText('Context')).toHaveValue('Focus on lesson 3');

    rerender(
      <QuizAiDraftDialog
        open
        onOpenChange={vi.fn()}
        isGenerating={false}
        resetKey={0}
        onSubmit={onSubmit}
      />
    );

    expect(screen.getByLabelText('Multiple Choice')).toHaveValue(3);
    expect(screen.getByLabelText('Context')).toHaveValue('Focus on lesson 3');

    rerender(
      <QuizAiDraftDialog
        open
        onOpenChange={vi.fn()}
        isGenerating={false}
        resetKey={1}
        onSubmit={onSubmit}
      />
    );

    expect(screen.queryByLabelText('Multiple Choice')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Context')).toHaveValue('');
    expect(
      screen.getByRole('combobox', { name: 'Question Category' })
    ).toHaveTextContent('Select a question category...');
  });
});
