import { describe, expect, it } from 'vitest';
import {
  hydrateLiveGameSnapshotAvatars,
  liveGameAvatarObjectKeys,
} from '@/components/game-quiz/live-game-avatar-hydration';
import type { LiveGameSnapshot } from '@/lib/game-quiz/runtime-protocol';

const avatarKey = 'users/user-1/avatars/avatar.webp';
const remoteImage = 'https://example.com/avatar.webp';

const snapshot: LiveGameSnapshot = {
  answerCount: 1,
  closedReason: null,
  currentRound: {
    id: '00000000-0000-4000-8000-000000000005',
    maxPoints: 1000,
    options: [
      {
        answerers: [
          {
            displayName: 'Answerer',
            id: '00000000-0000-4000-8000-000000000006',
            image: avatarKey,
          },
        ],
        id: '00000000-0000-4000-8000-000000000007',
        order: 0,
        text: 'Answer',
      },
    ],
    order: 0,
    prompt: 'Question',
    timeLimitSeconds: 20,
  },
  currentRoundIndex: 0,
  endedAt: null,
  gameQuizId: '00000000-0000-4000-8000-000000000001',
  gameTitle: 'Quiz',
  joinCode: '123456',
  joiningLocked: false,
  leaderboard: [
    {
      displayName: 'Leader',
      id: '00000000-0000-4000-8000-000000000003',
      image: avatarKey,
      score: 100,
    },
  ],
  myAnswer: null,
  participant: {
    displayName: 'Player',
    id: '00000000-0000-4000-8000-000000000002',
    image: avatarKey,
    score: 100,
  },
  participants: [
    {
      displayName: 'Remote',
      id: '00000000-0000-4000-8000-000000000004',
      image: remoteImage,
      score: 0,
    },
  ],
  phase: 'QUESTION_OPEN',
  stateVersion: 1,
  totalRounds: 1,
};

describe('live game avatar hydration', () => {
  it('collects avatar keys and replaces unresolved keys with fallbacks', () => {
    expect(liveGameAvatarObjectKeys(snapshot)).toEqual([avatarKey]);
    const unresolved = hydrateLiveGameSnapshotAvatars(snapshot, new Map());
    expect(unresolved?.participant?.image).toBeNull();
    expect(unresolved?.leaderboard[0]?.image).toBeNull();
    expect(
      unresolved?.currentRound?.options[0]?.answerers?.[0]?.image
    ).toBeNull();
    expect(unresolved?.participants[0]?.image).toBe(remoteImage);
  });

  it('uses the signed URL in every rendered avatar position', () => {
    const signedUrl = 'https://storage.example/signed-avatar';
    const hydrated = hydrateLiveGameSnapshotAvatars(
      snapshot,
      new Map([[avatarKey, signedUrl]])
    );
    expect(hydrated?.participant?.image).toBe(signedUrl);
    expect(hydrated?.leaderboard[0]?.image).toBe(signedUrl);
    expect(hydrated?.currentRound?.options[0]?.answerers?.[0]?.image).toBe(
      signedUrl
    );
  });
});
