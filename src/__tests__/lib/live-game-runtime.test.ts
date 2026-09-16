import { describe, expect, it } from 'vitest';
import {
  applyHostCommand,
  createLiveGameRuntime,
  joinLiveGame,
  projectLiveGameSnapshot,
  submitLiveGameAnswer,
  terminateForMissingHost,
  trustedLiveGameProfile,
} from '@/lib/game-quiz/runtime-engine';
import type { RoomInitialization } from '@/lib/game-quiz/runtime-protocol';

const ids = {
  quiz: '00000000-0000-4000-8000-000000000001',
  session: '00000000-0000-4000-8000-000000000002',
  host: '00000000-0000-4000-8000-000000000003',
  player: '00000000-0000-4000-8000-000000000004',
  round: '00000000-0000-4000-8000-000000000005',
  correct: '00000000-0000-4000-8000-000000000006',
  wrong: '00000000-0000-4000-8000-000000000007',
  init: '00000000-0000-4000-8000-000000000008',
  answer: '00000000-0000-4000-8000-000000000009',
};

const initialization: RoomInitialization = {
  type: 'session.initialize',
  initializationKey: ids.init,
  payloadHash: 'a'.repeat(64),
  session: {
    id: ids.session,
    gameQuizId: ids.quiz,
    hostId: ids.host,
    title: 'Planet Rally',
    topic: null,
    difficulty: null,
    joinCode: '123456',
    phase: 'LOBBY',
    currentRoundIndex: null,
    joiningLocked: false,
    stateVersion: 1,
    startedAt: null,
    endedAt: null,
    closedReason: null,
    createdAt: '2026-08-30T00:00:00.000Z',
  },
  rounds: [
    {
      id: ids.round,
      sourceQuestionId: null,
      orderIndex: 0,
      prompt: 'Which planet is red?',
      hint: null,
      explanation: 'Mars is red.',
      timerSeconds: 20,
      maxPoints: 1000,
      openedAt: null,
      deadlineAt: null,
      revealedAt: null,
      options: [
        { id: ids.correct, orderIndex: 0, text: 'Mars', isCorrect: true },
        { id: ids.wrong, orderIndex: 1, text: 'Venus', isCorrect: false },
      ],
    },
  ],
};

describe('PartyKit live-game engine', () => {
  it('enforces state versions and answer idempotency', () => {
    const state = createLiveGameRuntime(initialization);
    const host = {
      audience: 'HOST' as const,
      userId: ids.host,
      role: 'TEACHER',
    };
    const player = {
      audience: 'PARTICIPANT' as const,
      userId: ids.player,
      role: 'STUDENT',
    };
    joinLiveGame(state, player, { displayName: 'Sam', image: null });
    applyHostCommand(state, host, {
      action: 'START',
      expectedStateVersion: 1,
    });
    const first = submitLiveGameAnswer(state, player, {
      roundId: ids.round,
      selectedOptionId: ids.correct,
      idempotencyKey: ids.answer,
    });
    const replay = submitLiveGameAnswer(state, player, {
      roundId: ids.round,
      selectedOptionId: ids.correct,
      idempotencyKey: ids.answer,
    });
    expect(first.idempotent).toBe(false);
    expect(replay.idempotent).toBe(true);
    expect(state.answers).toHaveLength(1);
    expect(() =>
      applyHostCommand(state, host, {
        action: 'NEXT',
        expectedStateVersion: 1,
      })
    ).toThrowError(/changed/i);
  });

  it('does not leak correctness or other players to an active participant', () => {
    const state = createLiveGameRuntime(initialization);
    const player = {
      audience: 'PARTICIPANT' as const,
      userId: ids.player,
      role: 'STUDENT',
    };
    joinLiveGame(state, player, { displayName: 'Sam', image: null });
    applyHostCommand(
      state,
      { audience: 'HOST', userId: ids.host, role: 'TEACHER' },
      { action: 'START', expectedStateVersion: 1 }
    );
    const snapshot = projectLiveGameSnapshot(
      state,
      player,
      new Set([ids.player])
    );
    expect(snapshot.participants).toEqual([]);
    expect(snapshot.leaderboard).toEqual([]);
    expect(snapshot.currentRound?.options[0]).not.toHaveProperty('isCorrect');
    expect(snapshot.currentRound).not.toHaveProperty('explanation');
  });

  it('keeps a guest player and score on reconnect without accepting a forged name', () => {
    const state = createLiveGameRuntime(initialization);
    const guest = {
      audience: 'PARTICIPANT' as const,
      guestDisplayName: 'Taylor',
      identityKind: 'GUEST' as const,
      role: null,
      userId: ids.player,
    };
    const initial = joinLiveGame(
      state,
      guest,
      trustedLiveGameProfile(guest, { displayName: 'Imposter', image: 'fake' })
    );
    expect(initial).toMatchObject({
      guestId: ids.player,
      userId: null,
      displayName: 'Taylor',
      image: null,
    });
    applyHostCommand(
      state,
      { audience: 'HOST', userId: ids.host, role: 'TEACHER' },
      { action: 'START', expectedStateVersion: 1 }
    );
    submitLiveGameAnswer(state, guest, {
      roundId: ids.round,
      selectedOptionId: ids.correct,
      idempotencyKey: ids.answer,
    });
    const score = initial!.score;
    const resumed = joinLiveGame(
      state,
      guest,
      trustedLiveGameProfile(guest, { displayName: 'Changed', image: null })
    );
    expect(resumed?.id).toBe(initial?.id);
    expect(resumed?.score).toBe(score);
    expect(resumed?.displayName).toBe('Taylor');
    expect(state.participants).toHaveLength(1);
    expect(() =>
      applyHostCommand(
        state,
        { ...guest, audience: 'HOST', role: 'ADMIN' },
        { action: 'END_GAME', expectedStateVersion: state.session.stateVersion }
      )
    ).toThrowError(/Only the Game Session host/i);
  });

  it('applies joining locks to a new guest but lets an existing guest reconnect', () => {
    const state = createLiveGameRuntime(initialization);
    const guest = {
      audience: 'PARTICIPANT' as const,
      identityKind: 'GUEST' as const,
      role: null,
      userId: ids.player,
    };
    joinLiveGame(state, guest, { displayName: 'Taylor', image: null });
    applyHostCommand(
      state,
      { audience: 'HOST', userId: ids.host, role: 'TEACHER' },
      {
        action: 'SET_JOINING_LOCKED',
        expectedStateVersion: 1,
        joiningLocked: true,
      }
    );
    expect(
      joinLiveGame(state, guest, { displayName: 'Taylor', image: null })
    ).toMatchObject({ guestId: ids.player });
    expect(() =>
      joinLiveGame(
        state,
        { ...guest, userId: crypto.randomUUID() },
        { displayName: 'Other', image: null }
      )
    ).toThrowError(/locked joining/i);
  });

  it('ends an open session for a missing host exactly once', () => {
    const state = createLiveGameRuntime(initialization);

    expect(terminateForMissingHost(state)).toBe(true);
    expect(state.session).toMatchObject({
      closedReason: 'HOST_LEFT',
      joiningLocked: true,
      phase: 'FINAL_CELEBRATION',
    });
    expect(state.session.endedAt).not.toBeNull();
    expect(terminateForMissingHost(state)).toBe(false);
  });
});
