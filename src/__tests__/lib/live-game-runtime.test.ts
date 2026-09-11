import { describe, expect, it } from 'vitest';
import {
  applyHostCommand,
  createLiveGameRuntime,
  joinLiveGame,
  projectLiveGameSnapshot,
  submitLiveGameAnswer,
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
});
