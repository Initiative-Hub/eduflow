import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameQuizHostClient } from '@/components/game-quiz/game-quiz-host-client';
import {
  activateLiveGameSession,
  readLiveGameSession,
} from '@/components/game-quiz/live-game-session';
import type { GameSessionSnapshot } from '@/components/game-quiz/types';
import { TooltipProvider } from '@/components/ui/tooltip';

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));
vi.mock('react-confetti', () => ({ default: () => null }));

const { answerProgress, command, getHostSession, heartbeatHost } = vi.hoisted(
  () => ({
    answerProgress: vi.fn(),
    command: vi.fn(),
    getHostSession: vi.fn(),
    heartbeatHost: vi.fn(),
  })
);

vi.mock('@/components/game-quiz/api', () => ({
  gameQuizApi: {
    answerProgress,
    command,
    getHostSession,
    heartbeatHost,
  },
}));

vi.mock('@/components/game-quiz/use-game-quiz-realtime', () => ({
  useGameQuizRealtime: vi.fn(),
}));

vi.mock('@/components/game-quiz/use-host-session-lifecycle', () => ({
  useHostSessionLifecycle: vi.fn(),
}));

const { useLiveGameSession } = vi.hoisted(() => ({
  useLiveGameSession: vi.fn(),
}));

vi.mock('@/components/game-quiz/use-live-game-session', () => ({
  useLiveGameSession,
}));

const hostSelection = {
  audience: 'HOST' as const,
  sessionId: '00000000-0000-4000-8000-000000000001',
  version: 2 as const,
};

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
  phase:
    | 'LOBBY'
    | 'QUESTION_OPEN'
    | 'REVEAL'
    | 'SCOREBOARD'
    | 'FINAL_CELEBRATION',
  endedAt: string | null = null
): GameSessionSnapshot {
  return {
    gameQuizId: 'game-quiz-1',
    realtimeKey: 'session-key',
    gameTitle: 'Planet Rally',
    joinCode: '123456',
    joiningLocked: false,
    endedAt,
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
      <TooltipProvider>
        <GameQuizHostClient gameQuizId="game-quiz-1" />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

afterEach(() => {
  sessionStorage.clear();
  vi.restoreAllMocks();
});

beforeEach(() => {
  vi.clearAllMocks();
  useLiveGameSession.mockReturnValue({
    session: hostSelection,
    isHydrated: true,
  });
});

describe('GameQuizHostClient', () => {
  it('shows two named respondents and a scrollable overflow during reveal', async () => {
    const user = userEvent.setup();
    const session = createSession('REVEAL');
    session.currentRound!.options[0] = {
      ...session.currentRound!.options[0]!,
      answerCount: 4,
      answerers: [
        { id: 'p1', displayName: 'Sam Rivera', image: null },
        {
          id: 'p2',
          displayName: 'Alex Kim',
          image: 'https://example.com/alex.png',
        },
        { id: 'p3', displayName: 'Jo Lee', image: null },
        { id: 'p4', displayName: 'Taylor Chen', image: null },
      ],
    };
    getHostSession.mockResolvedValue(session);
    answerProgress.mockResolvedValue({ answerCount: 4 });

    renderHost();

    expect((await screen.findAllByText('4')).length).toBeGreaterThan(0);
    const sam = screen.getByRole('button', { name: 'Sam Rivera' });
    const alex = screen.getByRole('button', { name: 'Alex Kim' });
    expect(sam).toBeInTheDocument();
    expect(alex).toBeInTheDocument();
    await user.hover(sam);
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Sam Rivera');
    await user.unhover(sam);
    await user.hover(alex);
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Alex Kim');
    await user.unhover(alex);

    const overflow = screen.getByRole('button', { name: '2 more respondents' });
    expect(overflow).toHaveTextContent('+2');
    await user.click(overflow);
    expect(await screen.findByText('Jo Lee')).toBeVisible();
    const popover = screen.getByRole('dialog');
    expect(popover).toHaveTextContent('Jo Lee');
    expect(popover).toHaveTextContent('Taylor Chen');
    expect(popover.querySelectorAll('[data-slot="avatar"]')).toHaveLength(2);
  });

  it.each([0, 1, 2])(
    'does not show overflow for %i respondents',
    async (count) => {
      const session = createSession('REVEAL');
      session.currentRound!.options[0] = {
        ...session.currentRound!.options[0]!,
        answerCount: count,
        answerers: [
          { id: 'p1', displayName: 'Sam Rivera', image: null },
          { id: 'p2', displayName: 'Alex Kim', image: null },
        ].slice(0, count),
      };
      getHostSession.mockResolvedValue(session);
      answerProgress.mockResolvedValue({ answerCount: count });

      renderHost();

      await screen.findByText('Which planet is red?');
      expect(
        screen.queryByRole('button', { name: /more respondents/ })
      ).not.toBeInTheDocument();
      expect(
        screen
          .queryAllByTestId('respondent-stack')[0]
          ?.querySelectorAll('button')
      ).toHaveLength(count);
    }
  );

  it('starts a fresh host session without closing it', async () => {
    getHostSession.mockResolvedValue(createSession('LOBBY'));
    answerProgress.mockResolvedValue({ answerCount: 0 });

    renderHost();

    await waitFor(() =>
      expect(getHostSession).toHaveBeenCalledWith(
        'game-quiz-1',
        '00000000-0000-4000-8000-000000000001'
      )
    );
  });

  it('redirects to editing when no host session is stored', async () => {
    useLiveGameSession.mockReturnValue({ session: null, isHydrated: true });

    renderHost();

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith('/games/game-quiz-1/edit')
    );
    expect(getHostSession).not.toHaveBeenCalled();
  });

  it.each([
    [
      'the server cannot load it',
      () => getHostSession.mockRejectedValue(new Error('Missing session')),
    ],
    [
      'the server returns no snapshot',
      () => getHostSession.mockResolvedValue(undefined),
    ],
    [
      'the server reports it ended',
      () =>
        getHostSession.mockResolvedValue(
          createSession('LOBBY', '2026-08-15T10:00:00.000Z')
        ),
    ],
  ])(
    'clears the stored session and redirects when %s',
    async (_scenario, arrange) => {
      activateLiveGameSession(hostSelection);
      arrange();

      renderHost();

      await waitFor(() =>
        expect(replace).toHaveBeenCalledWith('/games/game-quiz-1/edit')
      );
      expect(readLiveGameSession('HOST')).toBeNull();
    }
  );

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

    expect(
      await screen.findByText('host.endGameConfirmTitle')
    ).toBeInTheDocument();
    const confirmButtons = screen.getAllByRole('button', {
      name: 'host.endGame',
    });
    const confirmButton = confirmButtons[confirmButtons.length - 1];
    expect(confirmButton).toBeInTheDocument();
    await user.click(confirmButton!);

    expect(command).toHaveBeenCalledWith(
      'game-quiz-1',
      '00000000-0000-4000-8000-000000000001',
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
      '/games/game-quiz-1/report?sessionId=00000000-0000-4000-8000-000000000001'
    );
    expect(reportLink).toHaveAttribute('target', '_blank');
    expect(
      screen.queryByRole('button', { name: 'host.next' })
    ).not.toBeInTheDocument();
  });
});
