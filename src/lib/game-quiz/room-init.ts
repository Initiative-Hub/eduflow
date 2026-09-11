import { sha256Hex, signLiveGameServiceRequest } from './live-game-security';
import {
  type RoomInitialization,
  roomInitializationSchema,
} from './runtime-protocol';
import type { SessionWithGameData } from './types';

function requiredEnvironment(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

async function createRoomInitialization(
  session: SessionWithGameData
): Promise<RoomInitialization> {
  const base = {
    initializationKey: session.initializationKey,
    rounds: session.rounds.map((round) => ({
      id: round.id,
      sourceQuestionId: round.sourceQuestionId,
      orderIndex: round.orderIndex,
      prompt: round.prompt,
      hint: round.hint,
      explanation: round.explanation,
      timerSeconds: round.timerSeconds,
      maxPoints: round.maxPoints,
      openedAt: null,
      deadlineAt: null,
      revealedAt: null,
      options: round.options.map((option) => ({
        id: option.id,
        orderIndex: option.orderIndex,
        text: option.text,
        isCorrect: option.isCorrect,
      })),
    })),
    session: {
      id: session.id,
      gameQuizId: session.gameQuizId,
      hostId: session.hostId,
      title: session.title,
      topic: session.topic,
      difficulty: session.difficulty,
      joinCode: session.joinCode,
      phase: 'LOBBY' as const,
      currentRoundIndex: null,
      joiningLocked: false,
      stateVersion: 1,
      startedAt: null,
      endedAt: null,
      closedReason: null,
      createdAt: session.createdAt.toISOString(),
    },
  };
  return roomInitializationSchema.parse({
    type: 'session.initialize',
    ...base,
    payloadHash: await sha256Hex(
      JSON.stringify({ rounds: base.rounds, session: base.session })
    ),
  });
}

export async function initializePartyKitRoom(session: SessionWithGameData) {
  const initialization = await createRoomInitialization(session);
  const body = JSON.stringify(initialization);
  const base = requiredEnvironment('NEXT_PUBLIC_PARTYKIT_HOST');
  const url = new URL(`/parties/main/${session.id}`, base);
  const headers = await signLiveGameServiceRequest({
    body,
    direction: 'next-to-partykit',
    method: 'POST',
    pathname: url.pathname,
    secret: requiredEnvironment('LIVE_GAME_S2S_SECRET'),
  });
  const response = await fetch(url, { body, headers, method: 'POST' });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `PartyKit room initialization failed (${response.status}): ${detail}`
    );
  }
}
