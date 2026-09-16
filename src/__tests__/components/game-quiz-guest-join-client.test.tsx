import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { gameQuizCopy } from '@/components/game-quiz/copy';
import { GameQuizJoinClient } from '@/components/game-quiz/game-quiz-join-client';
import { requestLiveGameTicket } from '@/components/game-quiz/live-game-client';
import { activateLiveGameSession } from '@/components/game-quiz/live-game-session';

const replace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams('code=123456'),
}));
vi.mock('@/components/game-quiz/live-game-client', () => ({
  requestLiveGameTicket: vi.fn(),
}));
vi.mock('@/components/game-quiz/live-game-session', () => ({
  activateLiveGameSession: vi.fn(),
}));

function renderJoin(isAuthenticated: boolean) {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <GameQuizJoinClient
        copy={gameQuizCopy}
        isAuthenticated={isAuthenticated}
      />
    </QueryClientProvider>
  );
}

describe('guest game join form', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requestLiveGameTicket).mockResolvedValue({
      avatarAccessExpiresAt: '',
      avatarAccessToken: '',
      expiresAt: '',
      guestGrant: 'signed-grant',
      profile: { displayName: 'Taylor', image: null },
      roomId: 'room-one',
      token: 'ticket',
    });
  });

  it('asks a guest for a name and submits the trimmed value', async () => {
    renderJoin(false);
    const join = screen.getByRole('button', { name: 'join.join' });
    fireEvent.click(join);
    expect(screen.getByRole('alert')).toHaveTextContent('join.nameRequired');
    expect(requestLiveGameTicket).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('join.nameLabel'), {
      target: { value: '  Taylor  ' },
    });
    fireEvent.click(join);
    await waitFor(() =>
      expect(requestLiveGameTicket).toHaveBeenCalledWith({
        audience: 'PARTICIPANT',
        displayName: 'Taylor',
        joinCode: '123456',
      })
    );
    await waitFor(() =>
      expect(activateLiveGameSession).toHaveBeenCalledWith(
        expect.objectContaining({
          guestGrant: 'signed-grant',
          identityKind: 'GUEST',
          sessionId: 'room-one',
        })
      )
    );
  });

  it('keeps the signed-in join form free of a name field', () => {
    renderJoin(true);
    expect(screen.queryByLabelText('join.nameLabel')).not.toBeInTheDocument();
  });
});
