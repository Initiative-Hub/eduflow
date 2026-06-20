import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { WordbankReviewDialog } from '@/app/[locale]/(dashboard)/english/wordbank/wordbank-components';
import type { WordbankReviewSessionResult } from '@/services/english/SavedVocabularyService';

const { quizProps } = vi.hoisted(() => ({
  quizProps: [] as Array<{ deliveryMode?: string; onStart?: () => void }>,
}));

vi.mock('@/components/quiz', () => ({
  Quiz: (props: { deliveryMode?: string; onStart?: () => void }) => {
    quizProps.push(props);

    return (
      <div data-delivery-mode={props.deliveryMode} data-testid="wordbank-quiz">
        <button type="button" onClick={props.onStart}>
          Start Quiz
        </button>
      </div>
    );
  },
}));

const messages: Record<string, string> = {
  answerTimingEnd: 'After the quiz',
  answerTimingInstant: 'After each question',
  answerTimingLabel: 'Show feedback',
  reviewDialogDescription: 'Review due words.',
  reviewDialogTitle: 'Wordbank Due Quiz',
};

const t = (key: string) => messages[key] ?? key;

const session: WordbankReviewSessionResult = {
  dueCount: 1,
  sessionId: 'review-session-1',
  quiz: {
    description: 'Review due words.',
    questions: [],
    title: 'Wordbank Review',
    type: 'multiple_choice',
  },
};

describe('WordbankReviewDialog', () => {
  it('uses clear feedback timing copy and a visible pill-style selected state', async () => {
    const user = userEvent.setup();

    render(
      <WordbankReviewDialog
        onComplete={vi.fn()}
        onOpenChange={vi.fn()}
        open
        result={null}
        session={session}
        t={t}
      />
    );

    const feedbackGroup = screen.getByRole('group', {
      name: messages.answerTimingLabel,
    });
    expect(feedbackGroup).toHaveClass(
      'rounded-full',
      'bg-muted/60',
      'p-1',
      'shadow-inner'
    );
    expect(screen.getByText(messages.answerTimingLabel)).toBeInTheDocument();

    const afterQuizOption = screen.getByRole('radio', {
      name: messages.answerTimingEnd,
    });
    expect(afterQuizOption).toHaveClass(
      'data-[state=on]:bg-primary/10',
      'data-[state=on]:text-primary',
      'data-[state=on]:shadow-sm'
    );
    expect(screen.getByTestId('wordbank-quiz')).toHaveAttribute(
      'data-delivery-mode',
      'POST_QUIZ_REVIEW'
    );

    await user.click(
      screen.getByRole('radio', { name: messages.answerTimingInstant })
    );

    expect(quizProps.at(-1)?.deliveryMode).toBe('INSTANT_FEEDBACK');
    expect(screen.getByTestId('wordbank-quiz')).toHaveAttribute(
      'data-delivery-mode',
      'INSTANT_FEEDBACK'
    );
  });

  it('hides the feedback timing control after the quiz starts', async () => {
    const user = userEvent.setup();

    render(
      <WordbankReviewDialog
        onComplete={vi.fn()}
        onOpenChange={vi.fn()}
        open
        result={null}
        session={session}
        t={t}
      />
    );

    expect(screen.getByText(messages.answerTimingLabel)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Start Quiz' }));

    expect(
      screen.queryByText(messages.answerTimingLabel)
    ).not.toBeInTheDocument();
  });
});
