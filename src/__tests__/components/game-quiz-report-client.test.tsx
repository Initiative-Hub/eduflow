import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GameQuizReportClient } from '@/components/game-quiz/game-quiz-report-client';

const { report } = vi.hoisted(() => ({ report: vi.fn() }));

vi.mock('@/components/game-quiz/api', () => ({
  gameQuizApi: { report },
}));

function renderReport() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <GameQuizReportClient gameQuizId="game-quiz-1" runKey="context-key" />
    </QueryClientProvider>
  );
}

describe('GameQuizReportClient', () => {
  it('renders question numbers and zero responses from the report contract', async () => {
    report.mockResolvedValue({
      session: {
        id: 'session-1',
        gameTitle: 'Planet Rally',
        joinCode: '123456',
        phase: 'FINAL_CELEBRATION',
        createdAt: '2026-08-09T10:00:00.000Z',
        completedAt: '2026-08-09T10:05:00.000Z',
      },
      participants: [],
      rounds: [
        {
          id: 'round-1',
          order: 0,
          prompt: 'First question',
          responseCount: 0,
          correctCount: 0,
          averagePoints: 0,
        },
      ],
    });

    renderReport();

    expect(await screen.findByText('Planet Rally')).toBeInTheDocument();
    expect(
      screen.getByRole('row', { name: /1First question 0 0 0/ })
    ).toBeInTheDocument();
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
    expect(report).toHaveBeenCalledWith('game-quiz-1', 'context-key');
  });
});
