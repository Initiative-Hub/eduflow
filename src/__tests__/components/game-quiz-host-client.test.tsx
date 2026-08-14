import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { GameQuizHostClient } from '@/components/game-quiz/game-quiz-host-client';

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock('react-confetti', () => ({ default: () => null }));

const {
  answerProgress,
  closeHostSession,
  command,
  getHostSession,
  heartbeatHost,
} = vi.hoisted(() => ({
  answerProgress: vi.fn(),
  closeHostSession: vi.fn(),
  command: vi.fn(),
  getHostSession: vi.fn(),
  heartbeatHost: vi.fn(),
}));

vi.mock('@/components/game-quiz/api', () => ({
  gameQuizApi: {
    answerProgress,
    closeHostSession,
    command,
    getHostSession,
    heartbeatHost,
  },
}));

vi.mock('@/components/game-quiz/use-game-quiz-realtime', () => ({
  useGameQuizRealtime: vi.fn(),
}));

vi.mock('@/components/game-quiz/use-live-game-context', () => ({
  useLiveGameContext: () => ({
    context: {
      audience: 'HOST',
      contextKey: 'context-key',
      expiresAt: '2099-01-01T00:00:00.000Z',
      token: 'token',
      version: 1,
    },
    isHydrated: true,
  }),
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
    gameQuizId: 'game-quiz-1',
    realtimeKey: 'session-key',
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
      <GameQuizHostClient gameQuizId="game-quiz-1" />
    </QueryClientProvider>
  );
}

describe('GameQuizHostClient', () => {
  it('renders Skip as the sole primary question action', async () => {
    getHostSession.mockResolvedValue(createSession('QUESTION_OPEN'));
    answerProgress.mockResolvedValue({ answerCount: 1 });

    renderHost();

    expect(
      await screen.findByRole('button', { name: 'host.skip' })
    ).toBeInTheDocument();
    expect(screen.queryByText('host.lockAnswers')).not.toBeInTheDocument();
    expect(screen.queryByText('host.reveal')).not.toBeInTheDocument();
  });

  it('offers End game confirmation dialog during gameplay', async () => {
    const user = userEvent.setup();
    getHostSession.mockResolvedValue(createSession('QUESTION_OPEN'));
    answerProgress.mockResolvedValue({ answerCount: 1 });
    command.mockResolvedValue(createSession('FINAL_CELEBRATION'));

    renderHost();

    const endGameButton = await screen.findByRole('button', {
      name: 'host.endGame',
    });
    expect(endGameButton).toBeInTheDocument();
    await user.click(endGameButton);

    expect(await screen.findByText('host.endGameConfirmTitle')).toBeInTheDocument();
    const confirmButtons = screen.getAllByRole('button', { name: 'host.endGame' });
    const confirmButton = confirmButtons[confirmButtons.length - 1];
    expect(confirmButton).toBeInTheDocument();
    await user.click(confirmButton!);

    expect(command).toHaveBeenCalledWith(
      'game-quiz-1',
      expect.objectContaining({ contextKey: 'context-key' }),
      'END_GAME',
      2,
      undefined
    );
  });

  it('renders an avatar-only lobby roster without scores', async () => {
    getHostSession.mockResolvedValue(createSession('LOBBY'));
    answerProgress.mockResolvedValue({ answerCount: 0 });

    renderHost();

    expect(await screen.findByText('Sam')).toBeInTheDocument();
    expect(screen.getByText('SA')).toBeInTheDocument();
    expect(screen.queryByText('934')).not.toBeInTheDocument();
  });

  it('renders the mandatory scoreboard with Next', async () => {
    getHostSession.mockResolvedValue(createSession('SCOREBOARD'));
    answerProgress.mockResolvedValue({ answerCount: 1 });

    renderHost();

    expect(await screen.findByText('host.scoreboard')).toBeInTheDocument();
    expect(screen.getByText('Sam')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'host.next' })
    ).toBeInTheDocument();
  });

  it('renders the final podium with only View report', async () => {
    getHostSession.mockResolvedValue(createSession('FINAL_CELEBRATION'));
    answerProgress.mockResolvedValue({ answerCount: 1 });

    renderHost();

    expect(await screen.findByText('host.congratulations')).toBeInTheDocument();
    expect(screen.getByText('Sam')).toBeInTheDocument();
    expect(screen.getByText('Alex')).toBeInTheDocument();
    expect(screen.getByText('Jo')).toBeInTheDocument();
    const reportLink = screen.getByRole('link', { name: 'host.viewReport' });
    expect(reportLink).toHaveAttribute(
      'href',
      '/games/game-quiz-1/report?run=context-key'
    );
    expect(reportLink).toHaveAttribute('target', '_blank');
    expect(
      screen.queryByRole('button', { name: 'host.next' })
    ).not.toBeInTheDocument();
  });
});
