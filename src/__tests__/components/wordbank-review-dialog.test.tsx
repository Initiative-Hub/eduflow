import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { WordbankReviewDialog } from '@/app/[locale]/(dashboard)/english/wordbank/wordbank-components';
import type { WordbankReviewSessionResult } from '@/services/english/SavedVocabularyService';

const { quizProps } = vi.hoisted(() => ({
  quizProps: [] as Array<{ deliveryMode?: string }>,
}));

vi.mock('@/components/quiz', () => ({
  Quiz: (props: { deliveryMode?: string }) => {
    quizProps.push(props);

    return (
      <div
        data-delivery-mode={props.deliveryMode}
        data-testid="wordbank-quiz"
      />
    );
  },
}));

const messages: Record<string, string> = {
  answerTimingEnd: 'At the end',
  answerTimingInstant: 'Right away',
  answerTimingLabel: 'Answer timing',
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
  it('lets learners choose whether due-quiz answers appear right away or at the end', async () => {
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
});
