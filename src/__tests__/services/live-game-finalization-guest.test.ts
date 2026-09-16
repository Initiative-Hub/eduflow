import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sha256Hex } from '@/lib/game-quiz/live-game-security';
import { processLiveGameFinalization } from '@/services/LiveGameFinalizationService';

const mocks = vi.hoisted(() => ({
  findParticipant: vi.fn(),
  findSession: vi.fn(),
  updateSession: vi.fn(),
  upsertParticipant: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: async (
      callback: (transaction: unknown) => Promise<unknown>
    ) =>
      callback({
        gameParticipant: {
          findUnique: mocks.findParticipant,
          upsert: mocks.upsertParticipant,
        },
        gameSession: {
          findUnique: mocks.findSession,
          update: mocks.updateSession,
        },
      }),
  },
}));

const sessionId = '00000000-0000-4000-8000-000000000001';
const finalizationId = '00000000-0000-4000-8000-000000000002';
const guestId = '00000000-0000-4000-8000-000000000003';
const participantId = '00000000-0000-4000-8000-000000000004';

async function participantChunk(userId: string | null, guest: string | null) {
  const items = [
    {
      id: participantId,
      userId,
      guestId: guest,
      displayName: 'Taylor',
      joinedAt: '2026-09-15T00:00:00.000Z',
    },
  ];
  return {
    type: 'PARTICIPANTS' as const,
    sessionId,
    finalizationId,
    chunkIndex: 0,
    payloadHash: await sha256Hex(JSON.stringify(items)),
    items,
  };
}

describe('guest result finalization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findSession.mockResolvedValue({
      finalizationReceipt: {
        answerChunks: {},
        expectedAnswerCount: 0,
        expectedParticipantCount: 1,
        finalizationId,
        participantChunks: {},
        stateHash: 'a'.repeat(64),
        terminal: {},
      },
    });
    mocks.findParticipant.mockResolvedValue(null);
  });

  it('persists a guest with their name and a session-scoped identity', async () => {
    const message = await participantChunk(null, guestId);
    await expect(processLiveGameFinalization(message)).resolves.toEqual({
      accepted: true,
    });
    expect(mocks.findParticipant.mock.lastCall?.[0].where).toEqual({
      sessionId_guestId: { guestId, sessionId },
    });
    expect(mocks.upsertParticipant.mock.lastCall?.[0].create).toMatchObject({
      displayName: 'Taylor',
      guestId,
      id: participantId,
      userId: null,
    });
    expect(mocks.updateSession).toHaveBeenCalledOnce();
  });

  it('rejects participants with both or neither identities', async () => {
    await expect(
      processLiveGameFinalization(await participantChunk(null, null))
    ).rejects.toMatchObject({
      code: 'INVALID_PARTICIPANT_IDENTITY',
      status: 400,
    });
    await expect(
      processLiveGameFinalization({
        ...(await participantChunk(guestId, guestId)),
        chunkIndex: 1,
      })
    ).rejects.toMatchObject({
      code: 'INVALID_PARTICIPANT_IDENTITY',
      status: 400,
    });
    expect(mocks.upsertParticipant).not.toHaveBeenCalled();
  });
});
