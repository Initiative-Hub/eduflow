import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { gameQuizCopy } from '@/components/game-quiz/copy';
import { GameQuizPodium } from '@/components/game-quiz/game-quiz-podium';
import type { GameSessionSnapshot } from '@/components/game-quiz/types';

function createSession(participantCount: number): GameSessionSnapshot {
  const participants = [
    { id: 'first', displayName: 'Sam', image: null, score: 934 },
    { id: 'second', displayName: 'Alex', image: null, score: 880 },
    { id: 'third', displayName: 'Jo', image: null, score: 820 },
  ].slice(0, participantCount);

  return {
    id: 'session-1',
    gameQuizId: 'quiz-1',
    gameTitle: 'Planet Rally',
    joinCode: '123456',
    joiningLocked: true,
    phase: 'FINAL_CELEBRATION',
    stateVersion: 4,
    currentRound: null,
    currentRoundIndex: 1,
    totalRounds: 2,
    participant: participants[1] ?? participants[0] ?? null,
    participants,
    answerCount: 0,
    leaderboard: participants,
  };
}

describe('GameQuizPodium', () => {
  it('renders top three participants in second, first, then third podium order', () => {
    render(
      <GameQuizPodium
        copy={gameQuizCopy}
        session={createSession(3)}
        title={gameQuizCopy.host.podium}
      />
    );

    const entries = screen.getAllByRole('listitem');
    expect(entries.map((entry) => entry.textContent)).toEqual([
      expect.stringContaining('Alex'),
      expect.stringContaining('Sam'),
      expect.stringContaining('Jo'),
    ]);
  });

  it.each([1, 2])(
    'renders available podium placements for %i players',
    (count) => {
      render(
        <GameQuizPodium
          copy={gameQuizCopy}
          session={createSession(count)}
          title={gameQuizCopy.host.podium}
        />
      );

      expect(screen.getAllByRole('listitem')).toHaveLength(count);
    }
  );

  it('renders an empty-podium message and a participant final rank', () => {
    const session = createSession(0);
    render(
      <GameQuizPodium
        copy={gameQuizCopy}
        participant={{ id: 'outside', displayName: 'Lee', score: 500 }}
        session={session}
        title={gameQuizCopy.player.podium}
      />
    );

    expect(screen.getByText('player.noPodium')).toBeInTheDocument();
    expect(screen.getByText('player.rank –')).toBeInTheDocument();
    expect(screen.getByText('500')).toBeInTheDocument();
  });
});
