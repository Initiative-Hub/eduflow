import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { GameQuizPreviewClient } from '@/components/game-quiz/game-quiz-preview-client';

const { getGameQuiz } = vi.hoisted(() => ({ getGameQuiz: vi.fn() }));

vi.mock('@/components/game-quiz/api', () => ({
  gameQuizApi: { get: getGameQuiz },
}));

const gameQuiz = {
  id: 'game-quiz-1',
  title: 'Planet Rally',
  topic: 'Science',
  difficulty: 'MEDIUM' as const,
  templateKey: 'LIVE_QUIZ_RALLY' as const,
  revision: 2,
  updatedAt: '2026-08-01T00:00:00.000Z',
  questionCount: 2,
  settings: {
    randomizeQuestions: false,
    randomizeAnswers: false,
  },
  questions: [
    {
      id: 'question-1',
      order: 0,
      prompt: 'Which planet is red?',
      hint: null,
      explanation: 'Mars has iron oxide on its surface.',
      timeLimitSeconds: 20,
      maxPoints: 1000,
      options: [
        { id: 'mars', order: 0, text: 'Mars', isCorrect: true },
        { id: 'venus', order: 1, text: 'Venus', isCorrect: false },
      ],
    },
    {
      id: 'question-2',
      order: 1,
      prompt: 'Which planet is largest?',
      hint: null,
      explanation: null,
      timeLimitSeconds: 30,
      maxPoints: 1000,
      options: [
        { id: 'jupiter', order: 0, text: 'Jupiter', isCorrect: true },
        { id: 'earth', order: 1, text: 'Earth', isCorrect: false },
      ],
    },
  ],
};

function renderPreview() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <GameQuizPreviewClient gameQuizId={gameQuiz.id} />
    </QueryClientProvider>
  );
}

describe('GameQuizPreviewClient', () => {
  it('switches between question, reveal, and live ranking previews without a session', async () => {
    const user = userEvent.setup();
    getGameQuiz.mockResolvedValue(gameQuiz);

    renderPreview();

    expect(await screen.findByText('Which planet is red?')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'preview.participant' })
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByRole('button', { name: 'preview.previous' })
    ).toBeDisabled();

    const marsButton = screen.getByRole('button', { name: /Mars/ });
    await user.click(marsButton);
    expect(screen.getByText('preview.answerSelected')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'preview.reveal' }));
    expect(marsButton).toBeDisabled();
    expect(
      screen.getByText('Mars has iron oxide on its surface.')
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'player.leaderboard' })
    );
    expect(
      screen.getByRole('heading', { name: 'player.leaderboard' })
    ).toBeInTheDocument();
    expect(screen.getByText('Alex Mercer')).toBeInTheDocument();
    expect(screen.getByText('player.you')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'player.rank 1' }));
    expect(screen.getByText('player.you')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'preview.host' }));
    expect(
      screen.getByRole('button', { name: 'host.viewFullLeaderboard' })
    ).toBeInTheDocument();
    expect(screen.queryByText('player.you')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'preview.question' }));

    await user.click(screen.getByRole('button', { name: 'preview.next' }));
    expect(screen.getByText('Which planet is largest?')).toBeInTheDocument();
    expect(
      screen.queryByText('preview.answerSelected')
    ).not.toBeInTheDocument();
    expect(getGameQuiz).toHaveBeenCalledTimes(1);
  });
});
