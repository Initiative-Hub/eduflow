import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GameQuizReportClient } from '@/components/game-quiz/game-quiz-report-client';

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }) }));

const { report } = vi.hoisted(() => ({ report: vi.fn() }));

vi.mock('@/components/game-quiz/api', () => ({
  gameQuizApi: { report },
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
        phase: 'REPORT',
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
  });
});
