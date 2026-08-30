import type { Prisma } from '@/generated/prisma';
import { sha256Hex } from '@/lib/game-quiz/live-game-security';
import type { LiveGameFinalization } from '@/lib/game-quiz/runtime-protocol';
import { calculateGamePoints } from '@/lib/game-quiz/scoring';
import { prisma } from '@/lib/prisma';

type BeginMessage = Extract<LiveGameFinalization, { type: 'BEGIN' }>;
type ParticipantMessage = Extract<
  LiveGameFinalization,
  { type: 'PARTICIPANTS' }
>;
type AnswerMessage = Extract<LiveGameFinalization, { type: 'ANSWERS' }>;
type CommitMessage = Extract<LiveGameFinalization, { type: 'COMMIT' }>;

type ChunkReceipt = { hash: string; itemCount: number };
type FinalizationReceipt = {
  answerChunks: Record<string, ChunkReceipt>;
  committedAt?: string;
  expectedAnswerCount: number;
  expectedParticipantCount: number;
  finalizationId: string;
  participantChunks: Record<string, ChunkReceipt>;
  stateHash: string;
  terminal: BeginMessage['terminal'];
};

export class LiveGameFinalizationError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'LiveGameFinalizationError';
  }
}

const json = (value: FinalizationReceipt) =>
  value as unknown as Prisma.InputJsonValue;

function receiptFrom(value: unknown): FinalizationReceipt | null {
  if (!value || typeof value !== 'object') return null;
  const receipt = value as Partial<FinalizationReceipt>;
  return typeof receipt.finalizationId === 'string' &&
    typeof receipt.stateHash === 'string' &&
    typeof receipt.expectedAnswerCount === 'number' &&
    typeof receipt.expectedParticipantCount === 'number' &&
    receipt.terminal &&
    typeof receipt.terminal === 'object'
    ? (receipt as FinalizationReceipt)
    : null;
}

function requireReceipt(
  value: unknown,
  message: { finalizationId: string; sessionId: string }
) {
  const receipt = receiptFrom(value);
  if (!receipt || receipt.finalizationId !== message.finalizationId) {
    throw new LiveGameFinalizationError(
      'FINALIZATION_NOT_STARTED',
      409,
      'BEGIN must be accepted before finalization chunks.'
    );
  }
  return receipt;
}

function acknowledgeChunk(
  receipt: FinalizationReceipt,
  kind: 'answerChunks' | 'participantChunks',
  chunkIndex: number,
  payloadHash: string,
  itemCount: number
) {
  const key = String(chunkIndex);
  const existing = receipt[kind][key];
  if (existing) {
    if (existing.hash !== payloadHash || existing.itemCount !== itemCount) {
      throw new LiveGameFinalizationError(
        'FINALIZATION_CHUNK_CONFLICT',
        409,
        'An acknowledged finalization chunk cannot be changed.'
      );
    }
    return false;
  }
  receipt[kind][key] = { hash: payloadHash, itemCount };
  return true;
}

async function verifyChunkHash(items: unknown[], expected: string) {
  if ((await sha256Hex(JSON.stringify(items))) !== expected) {
    throw new LiveGameFinalizationError(
      'PAYLOAD_HASH_MISMATCH',
      400,
      'The finalization chunk hash does not match its payload.'
    );
  }
}

async function beginFinalization(message: BeginMessage) {
  return prisma.$transaction(async (transaction) => {
    const session = await transaction.gameSession.findUnique({
      where: { id: message.sessionId },
      select: { finalizationReceipt: true, runtimeStatus: true },
    });
    if (!session) {
      throw new LiveGameFinalizationError(
        'GAME_SESSION_NOT_FOUND',
        404,
        'The Game Session does not exist.'
      );
    }
    const existing = receiptFrom(session.finalizationReceipt);
    if (existing) {
      if (
        existing.finalizationId !== message.finalizationId ||
        existing.stateHash !== message.stateHash ||
        existing.expectedParticipantCount !==
          message.expectedParticipantCount ||
        existing.expectedAnswerCount !== message.expectedAnswerCount
      ) {
        throw new LiveGameFinalizationError(
          'FINALIZATION_CONFLICT',
          409,
          'This Game Session already has another finalization manifest.'
        );
      }
      return { accepted: true };
    }
    if (
      session.runtimeStatus !== 'ACTIVE' &&
      session.runtimeStatus !== 'FINALIZING'
    ) {
      throw new LiveGameFinalizationError(
        'INVALID_RUNTIME_STATUS',
        409,
        'The Game Session cannot begin finalization.'
      );
    }
    const roundIds = await transaction.gameRound.findMany({
      where: { sessionId: message.sessionId },
      select: { id: true },
    });
    if (
      roundIds.length !== message.terminal.rounds.length ||
      roundIds.some(
        ({ id }) => !message.terminal.rounds.some((round) => round.id === id)
      )
    ) {
      throw new LiveGameFinalizationError(
        'CANONICAL_ROUND_MISMATCH',
        400,
        'Finalization rounds do not match the initialized Game Session.'
      );
    }
    const receipt: FinalizationReceipt = {
      answerChunks: {},
      expectedAnswerCount: message.expectedAnswerCount,
      expectedParticipantCount: message.expectedParticipantCount,
      finalizationId: message.finalizationId,
      participantChunks: {},
      stateHash: message.stateHash,
      terminal: message.terminal,
    };
    await transaction.gameSession.update({
      where: { id: message.sessionId },
      data: { finalizationReceipt: json(receipt), runtimeStatus: 'FINALIZING' },
    });
    return { accepted: true };
  });
}

async function acceptParticipants(message: ParticipantMessage) {
  await verifyChunkHash(message.items, message.payloadHash);
  return prisma.$transaction(async (transaction) => {
    const session = await transaction.gameSession.findUnique({
      where: { id: message.sessionId },
      select: { finalizationReceipt: true },
    });
    const receipt = requireReceipt(session?.finalizationReceipt, message);
    if (
      !acknowledgeChunk(
        receipt,
        'participantChunks',
        message.chunkIndex,
        message.payloadHash,
        message.items.length
      )
    ) {
      return { accepted: true };
    }
    for (const participant of message.items) {
      const existing = await transaction.gameParticipant.findUnique({
        where: {
          sessionId_userId: {
            sessionId: message.sessionId,
            userId: participant.userId,
          },
        },
        select: { id: true },
      });
      if (existing && existing.id !== participant.id) {
        throw new LiveGameFinalizationError(
          'PARTICIPANT_ID_CONFLICT',
          409,
          'A participant has a conflicting canonical ID.'
        );
      }
      await transaction.gameParticipant.upsert({
        where: {
          sessionId_userId: {
            sessionId: message.sessionId,
            userId: participant.userId,
          },
        },
        create: {
          id: participant.id,
          sessionId: message.sessionId,
          userId: participant.userId,
          displayName: participant.displayName,
          joinedAt: new Date(participant.joinedAt),
          score: 0,
        },
        update: {
          displayName: participant.displayName,
        },
      });
    }
    await transaction.gameSession.update({
      where: { id: message.sessionId },
      data: { finalizationReceipt: json(receipt) },
    });
    return { accepted: true };
  });
}

async function acceptAnswers(message: AnswerMessage) {
  await verifyChunkHash(message.items, message.payloadHash);
  return prisma.$transaction(async (transaction) => {
    const session = await transaction.gameSession.findUnique({
      where: { id: message.sessionId },
      select: { finalizationReceipt: true },
    });
    const receipt = requireReceipt(session?.finalizationReceipt, message);
    if (
      !acknowledgeChunk(
        receipt,
        'answerChunks',
        message.chunkIndex,
        message.payloadHash,
        message.items.length
      )
    ) {
      return { accepted: true };
    }
    const rounds = await transaction.gameRound.findMany({
      where: { sessionId: message.sessionId },
      include: { options: true },
    });
    for (const answer of message.items) {
      const participant = await transaction.gameParticipant.findFirst({
        where: { id: answer.participantId, sessionId: message.sessionId },
        select: { id: true },
      });
      const round = rounds.find((candidate) => candidate.id === answer.roundId);
      const option = round?.options.find(
        (candidate) => candidate.id === answer.selectedOptionId
      );
      const timing = receipt.terminal.rounds.find(
        (candidate) => candidate.id === answer.roundId
      );
      if (!participant || !round || !option || !timing?.openedAt) {
        throw new LiveGameFinalizationError(
          'CANONICAL_REFERENCE_MISMATCH',
          400,
          'An answer references data outside the initialized Game Session.'
        );
      }
      const submittedAt = new Date(answer.submittedAt);
      if (timing.deadlineAt && submittedAt >= new Date(timing.deadlineAt)) {
        throw new LiveGameFinalizationError(
          'ANSWER_AFTER_DEADLINE',
          400,
          'An answer was submitted after the canonical round deadline.'
        );
      }
      const responseTimeMs = Math.max(
        0,
        submittedAt.getTime() - new Date(timing.openedAt).getTime()
      );
      const pointsAwarded = calculateGamePoints(
        round.maxPoints,
        responseTimeMs,
        round.timerSeconds,
        option.isCorrect
      );
      await transaction.gameAnswer.upsert({
        where: {
          participantId_roundId: {
            participantId: participant.id,
            roundId: round.id,
          },
        },
        create: {
          id: answer.id,
          sessionId: message.sessionId,
          participantId: participant.id,
          roundId: round.id,
          selectedOptionId: option.id,
          idempotencyKey: answer.idempotencyKey,
          submittedAt,
          responseTimeMs,
          isCorrect: option.isCorrect,
          pointsAwarded,
        },
        update: {},
      });
    }
    await transaction.gameSession.update({
      where: { id: message.sessionId },
      data: { finalizationReceipt: json(receipt) },
    });
    return { accepted: true };
  });
}

const receivedCount = (chunks: Record<string, ChunkReceipt>) =>
  Object.values(chunks).reduce((sum, chunk) => sum + chunk.itemCount, 0);

async function commitFinalization(message: CommitMessage) {
  return prisma.$transaction(async (transaction) => {
    const session = await transaction.gameSession.findUnique({
      where: { id: message.sessionId },
      select: { finalizationReceipt: true, runtimeStatus: true },
    });
    const receipt = requireReceipt(session?.finalizationReceipt, message);
    if (receipt.stateHash !== message.stateHash) {
      throw new LiveGameFinalizationError(
        'FINALIZATION_CONFLICT',
        409,
        'The committed state hash does not match BEGIN.'
      );
    }
    if (session?.runtimeStatus === 'FINALIZED' && receipt.committedAt) {
      return { finalized: true };
    }
    if (
      receivedCount(receipt.participantChunks) !==
        receipt.expectedParticipantCount ||
      receivedCount(receipt.answerChunks) !== receipt.expectedAnswerCount
    ) {
      throw new LiveGameFinalizationError(
        'FINALIZATION_INCOMPLETE',
        409,
        'Not all finalization chunks have been received.'
      );
    }
    const [participantCount, answerCount] = await Promise.all([
      transaction.gameParticipant.count({
        where: { sessionId: message.sessionId },
      }),
      transaction.gameAnswer.count({ where: { sessionId: message.sessionId } }),
    ]);
    if (
      participantCount !== receipt.expectedParticipantCount ||
      answerCount !== receipt.expectedAnswerCount
    ) {
      throw new LiveGameFinalizationError(
        'FINALIZATION_COUNT_MISMATCH',
        409,
        'Persisted result counts do not match the manifest.'
      );
    }
    const scores = await transaction.gameAnswer.groupBy({
      by: ['participantId'],
      where: { sessionId: message.sessionId },
      _sum: { pointsAwarded: true },
    });
    await transaction.gameParticipant.updateMany({
      where: { sessionId: message.sessionId },
      data: { score: 0 },
    });
    for (const score of scores) {
      await transaction.gameParticipant.update({
        where: { id: score.participantId },
        data: { score: score._sum.pointsAwarded ?? 0 },
      });
    }
    for (const round of receipt.terminal.rounds) {
      await transaction.gameRound.update({
        where: { id: round.id },
        data: {
          openedAt: round.openedAt ? new Date(round.openedAt) : null,
          deadlineAt: round.deadlineAt ? new Date(round.deadlineAt) : null,
          revealedAt: round.revealedAt ? new Date(round.revealedAt) : null,
        },
      });
    }
    receipt.committedAt = new Date().toISOString();
    await transaction.gameSession.update({
      where: { id: message.sessionId },
      data: {
        closedReason: receipt.terminal.closeReason,
        currentRoundIndex: receipt.terminal.currentRoundIndex,
        endedAt: new Date(receipt.terminal.endedAt),
        finalizationReceipt: json(receipt),
        joinCodeReleasedAt: new Date(),
        joiningLocked: true,
        phase: 'FINAL_CELEBRATION',
        runtimeStatus: 'FINALIZED',
        startedAt: receipt.terminal.startedAt
          ? new Date(receipt.terminal.startedAt)
          : null,
        stateVersion: receipt.terminal.stateVersion,
      },
    });
    return { finalized: true };
  });
}

export function processLiveGameFinalization(message: LiveGameFinalization) {
  switch (message.type) {
    case 'BEGIN':
      return beginFinalization(message);
    case 'PARTICIPANTS':
      return acceptParticipants(message);
    case 'ANSWERS':
      return acceptAnswers(message);
    case 'COMMIT':
      return commitFinalization(message);
  }
}
