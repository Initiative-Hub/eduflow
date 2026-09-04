import { NextResponse } from 'next/server';
import { verifyLiveGameServiceRequest } from '@/lib/game-quiz/live-game-security';
import { liveGameFinalizationSchema } from '@/lib/game-quiz/runtime-protocol';
import {
  LiveGameFinalizationError,
  processLiveGameFinalization,
} from '@/services/LiveGameFinalizationService';

/**
 * @swagger
 * /api/v1/internal/live-game/finalize:
 *   post:
 *     tags: [Game Sessions]
 *     summary: Accept signed PartyKit finalization manifests and chunks
 *     security: [{ LiveGameServiceSignature: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object, required: [type, sessionId, finalizationId] }
 *     responses:
 *       200: { description: Idempotently accepted }
 *       400: { description: Invalid payload or canonical reference }
 *       401: { description: Invalid service signature }
 *       404: { description: Session not found }
 *       409: { description: Conflicting or incomplete finalization }
 */
export async function POST(request: Request) {
  const secret = process.env.LIVE_GAME_S2S_SECRET;
  if (!secret) throw new Error('LIVE_GAME_S2S_SECRET is required.');

  const body = await request.text();
  const valid =
    request.headers.get('X-Eduflow-Direction') === 'partykit-to-next' &&
    (await verifyLiveGameServiceRequest({
      body,
      direction: 'partykit-to-next',
      method: request.method,
      pathname: new URL(request.url).pathname,
      requestId: request.headers.get('X-Eduflow-Request-Id'),
      secret,
      signature: request.headers.get('X-Eduflow-Signature'),
      timestamp: request.headers.get('X-Eduflow-Timestamp'),
    }));

  if (!valid) {
    return NextResponse.json(
      {
        code: 'INVALID_SERVICE_SIGNATURE',
        message: 'Invalid service signature.',
      },
      { status: 401 }
    );
  }

  const parsed = liveGameFinalizationSchema.safeParse(JSON.parse(body));
  if (!parsed.success) {
    return NextResponse.json(
      { code: 'VALIDATION_ERROR', message: 'Invalid finalization payload.' },
      { status: 400 }
    );
  }

  try {
    return NextResponse.json(await processLiveGameFinalization(parsed.data));
  } catch (error) {
    if (error instanceof LiveGameFinalizationError) {
      return NextResponse.json(
        { code: error.code, message: error.message },
        { status: error.status }
      );
    }

    console.error('Failed to process live-game finalization.', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to persist game results.' },
      { status: 500 }
    );
  }
}
