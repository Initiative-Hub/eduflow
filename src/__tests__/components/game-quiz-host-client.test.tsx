import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { GameQuizHostClient } from '@/components/game-quiz/game-quiz-host-client';

const { answerProgress, command, getSession } = vi.hoisted(() => ({
  answerProgress: vi.fn(),
  command: vi.fn(),
  getSession: vi.fn(),
}));

vi.mock('@/components/game-quiz/api', () => ({
  gameQuizApi: {
    answerProgress,
    command,
    getSession,
  },
}));

vi.mock('@/components/game-quiz/use-game-quiz-realtime', () => ({
  useGameQuizRealtime: vi.fn(),
}));

const question = {
  id: 'round-1',
  order: 0,
  prompt: 'Which planet is red?',
  hint: null,
  explanation: 'Mars has iron oxide on its surface.',
  timeLimitSeconds: 20,
  maxPoints: 1000,
  openedAt: '2026-08-09T10:00:00.000Z',
  deadlineAt: '2026-08-09T10:00:20.000Z',
  options: [
    { id: 'mars', text: 'Mars', isCorrect: true, order: 0, answerCount: 1 },
    { id: 'venus', text: 'Venus', isCorrect: false, order: 1, answerCount: 0 },
  ],
};

function createSession(
  phase: 'LOBBY' | 'QUESTION_OPEN' | 'SCOREBOARD' | 'FINAL_CELEBRATION'
) {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    gameQuizId: 'game-quiz-1',
    gameTitle: 'Planet Rally',
    joinCode: '123456',
    joiningLocked: false,
    phase,
    stateVersion: 2,
    currentRound: question,
    currentRoundIndex: 0,
    totalRounds: 2,
    participants: [
      {
        id: 'participant-1',
        displayName: 'Sam',
        image: null,
        score: 934,
      },
    ],
    answerCount: 1,
    leaderboard: [
      { id: 'participant-1', displayName: 'Sam', image: null, score: 934 },
      { id: 'participant-2', displayName: 'Alex', image: null, score: 880 },
      { id: 'participant-3', displayName: 'Jo', image: null, score: 820 },
    ],
  };
}

function renderHost() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <GameQuizHostClient sessionId="11111111-1111-4111-8111-111111111111" />
    </QueryClientProvider>
  );
}

describe('GameQuizHostClient', () => {
  it('renders Skip as the sole primary question action', async () => {
    getSession.mockResolvedValue(createSession('QUESTION_OPEN'));
    answerProgress.mockResolvedValue({ answerCount: 1 });

    renderHost();

    expect(
      await screen.findByRole('button', { name: 'host.skip' })
    ).toBeInTheDocument();
    expect(screen.queryByText('host.lockAnswers')).not.toBeInTheDocument();
    expect(screen.queryByText('host.reveal')).not.toBeInTheDocument();
  });

  it('offers only End game from the gameplay overflow menu', async () => {
    const user = userEvent.setup();
    getSession.mockResolvedValue(createSession('QUESTION_OPEN'));
    answerProgress.mockResolvedValue({ answerCount: 1 });
    command.mockResolvedValue(createSession('FINAL_CELEBRATION'));

    renderHost();

    await user.click(
      await screen.findByRole('button', { name: 'host.endGame' })
    );
    const endGame = screen.getByRole('menuitem', { name: 'host.endGame' });
    expect(endGame).toBeInTheDocument();
    expect(screen.queryByText('host.endSession')).not.toBeInTheDocument();
    await user.click(endGame);
    expect(command).toHaveBeenCalledWith(
      '11111111-1111-4111-8111-111111111111',
      'END_GAME',
      2,
      undefined
    );
  });

  it('renders an avatar-only lobby roster without scores', async () => {
    getSession.mockResolvedValue(createSession('LOBBY'));
    answerProgress.mockResolvedValue({ answerCount: 0 });

    renderHost();

    expect(await screen.findByText('Sam')).toBeInTheDocument();
    expect(screen.getByText('SA')).toBeInTheDocument();
    expect(screen.queryByText('934')).not.toBeInTheDocument();
  });

  it('renders the mandatory scoreboard with Next', async () => {
    getSession.mockResolvedValue(createSession('SCOREBOARD'));
    answerProgress.mockResolvedValue({ answerCount: 1 });

    renderHost();

    expect(await screen.findByText('host.scoreboard')).toBeInTheDocument();
    expect(screen.getByText('Sam')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'host.next' })
    ).toBeInTheDocument();
  });

  it('renders the final podium with only End session and View report actions', async () => {
    getSession.mockResolvedValue(createSession('FINAL_CELEBRATION'));
    answerProgress.mockResolvedValue({ answerCount: 1 });

    renderHost();

    expect(await screen.findByText('host.podium')).toBeInTheDocument();
    expect(screen.getByText('Sam')).toBeInTheDocument();
    expect(screen.getByText('Alex')).toBeInTheDocument();
    expect(screen.getByText('Jo')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'host.endSession' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'host.viewReport' })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'host.next' })
    ).not.toBeInTheDocument();
  });
});
