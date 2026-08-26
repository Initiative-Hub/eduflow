import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { gameQuizCopy } from '@/components/game-quiz/copy';
import { GameQuizFullLeaderboardDialog } from '@/components/game-quiz/game-quiz-full-leaderboard-dialog';

describe('GameQuizFullLeaderboardDialog', () => {
  it('shows stable score-ordered final standings in a constrained dialog', async () => {
    const user = userEvent.setup();
    render(
      <GameQuizFullLeaderboardDialog
        copy={gameQuizCopy}
        leaderboard={[
          { id: 'alex', displayName: 'Alex', image: null, score: 800 },
          { id: 'sam', displayName: 'Sam', image: null, score: 1000 },
          { id: 'jo', displayName: 'Jo', image: null, score: 800 },
        ]}
      />
    );

    await user.click(
      screen.getByRole('button', { name: 'host.viewFullLeaderboard' })
    );

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAccessibleName('host.fullLeaderboardTitle');
    expect(dialog).toHaveClass('max-h-[80vh]');
    expect(dialog.querySelector('[data-slot="scroll-area"]')).toHaveClass(
      'max-h-100'
    );

    const rows = within(dialog).getAllByRole('row');
    expect(rows).toHaveLength(4);
    expect(rows.slice(1).map((row) => row.textContent)).toEqual([
      expect.stringContaining('Sam'),
      expect.stringContaining('Alex'),
      expect.stringContaining('Jo'),
    ]);
    expect(rows[2]).toHaveTextContent('2');
    expect(rows[3]).toHaveTextContent('3');

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows an empty state when the final standings are unavailable', async () => {
    const user = userEvent.setup();
    render(
      <GameQuizFullLeaderboardDialog copy={gameQuizCopy} leaderboard={[]} />
    );

    await user.click(
      screen.getByRole('button', { name: 'host.viewFullLeaderboard' })
    );

    expect(await screen.findByText('host.emptyLeaderboard')).toBeVisible();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
