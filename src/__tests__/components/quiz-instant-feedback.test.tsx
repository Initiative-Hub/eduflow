import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Quiz } from '@/components/quiz';
import type {
  ClientQuizContent,
  MultipleChoiceQuestion,
} from '@/lib/quiz-template/types';

vi.mock('next-intl', () => ({
  useTranslations:
    () => (key: string, values?: Record<string, string | number>) => {
      const messages: Record<string, string> = {
        checkAnswer: 'Check Answer',
        correctAnswer: 'Correct',
        incorrectAnswer: 'Incorrect',
        next: 'Next',
        previous: 'Previous',
        questionCount: '{count} Question',
        quizMode: 'Quiz mode',
        quizTitle: 'Quiz',
        startQuiz: 'Start Quiz',
        submitQuiz: 'Submit',
        'type.multiple_choice': 'Multiple Choice',
      };
      let message = messages[key] ?? key;

      for (const [name, value] of Object.entries(values ?? {})) {
        message = message.replaceAll(`{${name}}`, String(value));
      }

      return message;
    },
}));

const clientQuiz: ClientQuizContent = {
  description: 'Review due words.',
  questions: [
    {
      type: 'multiple_choice',
      prompt: 'Which definition matches "resign"?',
      options: [
        { id: 'option-correct', text: 'to voluntarily give up' },
        { id: 'option-wrong', text: 'to move quickly' },
      ],
    },
  ],
  title: 'Wordbank Review',
  type: 'multiple_choice',
};

const twoQuestionQuiz: ClientQuizContent = {
  ...clientQuiz,
  questions: [
    ...clientQuiz.questions,
    {
      type: 'multiple_choice',
      prompt: 'Which definition matches "orbit"?',
      options: [
        { id: 'orbit-correct', text: 'to move around something' },
        { id: 'orbit-wrong', text: 'to stop suddenly' },
      ],
    },
  ],
};

const reviewQuestion: MultipleChoiceQuestion = {
  type: 'multiple_choice',
  prompt: 'Which definition matches "resign"?',
  explanation: 'resign\ntừ bỏ\nto voluntarily give up',
  options: [
    {
      id: 'option-correct',
      isCorrect: true,
      text: 'to voluntarily give up',
    },
    { id: 'option-wrong', isCorrect: false, text: 'to move quickly' },
  ],
};

describe('Quiz instant feedback', () => {
  it('shows only the current question position in the progress badge', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ isCorrect: false, reviewQuestion }))
    );

    render(
      <Quiz
        deliveryMode="INSTANT_FEEDBACK"
        instantFeedbackUrl="/api/v1/english/wordbank/review-sessions/session-1/check"
        quiz={twoQuestionQuiz}
        quizId="session-1"
      />
    );

    await user.click(screen.getByRole('button', { name: /Start Quiz/ }));
    await user.click(screen.getByRole('button', { name: /to move quickly/ }));
    await user.click(screen.getByRole('button', { name: 'Check Answer' }));

    expect(screen.getAllByText('1/2')).toHaveLength(1);
    expect(screen.queryByText('0/2')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(screen.getAllByText('2/2')).toHaveLength(1);
    expect(screen.queryByText('0/2')).not.toBeInTheDocument();
  });

  it('marks a correct answer as correct right away', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ isCorrect: true, reviewQuestion }))
    );

    render(
      <Quiz
        deliveryMode="INSTANT_FEEDBACK"
        instantFeedbackUrl="/api/v1/english/wordbank/review-sessions/session-1/check"
        quiz={clientQuiz}
        quizId="session-1"
      />
    );

    await user.click(screen.getByRole('button', { name: /Start Quiz/ }));
    await user.click(
      screen.getByRole('button', { name: /to voluntarily give up/ })
    );
    await user.click(screen.getByRole('button', { name: 'Check Answer' }));

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /to voluntarily give up/ })
      ).toHaveClass('border-green-500');
    });
    expect(screen.queryByText('Correct')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /to voluntarily give up/ })
    ).toHaveClass('border-green-500');
    expect(
      screen.getByRole('button', { name: /to voluntarily give up/ })
    ).not.toHaveClass('border-red-500');
  });

  it('reveals the correct answer when a learner chooses the wrong option', async () => {
    const user = userEvent.setup();
    const fetch = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        Response.json({ isCorrect: false, reviewQuestion })
    );
    vi.stubGlobal('fetch', fetch);

    render(
      <Quiz
        deliveryMode="INSTANT_FEEDBACK"
        instantFeedbackUrl="/api/v1/english/wordbank/review-sessions/session-1/check"
        quiz={clientQuiz}
        quizId="session-1"
      />
    );

    await user.click(screen.getByRole('button', { name: /Start Quiz/ }));
    await user.click(screen.getByRole('button', { name: /to move quickly/ }));
    await user.click(screen.getByRole('button', { name: 'Check Answer' }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/v1/english/wordbank/review-sessions/session-1/check',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
    const requestInit = fetch.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(JSON.parse(requestInit?.body as string)).toEqual({
      answer: {
        selectedOptionId: 'option-wrong',
        type: 'multiple_choice',
      },
      questionIndex: 0,
    });
    await screen.findByText('resign');
    expect(screen.queryByText('Incorrect')).not.toBeInTheDocument();
    expect(screen.getByText('từ bỏ')).toBeInTheDocument();
    expect(
      screen.getAllByText('to voluntarily give up').length
    ).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /to move quickly/ })).toHaveClass(
      'border-red-500'
    );
    expect(
      screen.getByRole('button', { name: /to voluntarily give up/ })
    ).toHaveClass('border-green-500');
  });
});
