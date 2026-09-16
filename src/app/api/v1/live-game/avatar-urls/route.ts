import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import * as z from 'zod';
import { auth } from '@/lib/auth';
import { verifyLiveGameAvatarAccessToken } from '@/lib/game-quiz/live-game-security';
import {
  createAvatarReadSignedUrl,
  isAvatarObjectKey,
} from '@/lib/storage/avatar';

const requestSchema = z.object({
  sessionId: z.uuid(),
  objectKeys: z.array(z.string().min(1)).min(1).max(100),
});

function bearerToken(request: Request) {
  const authorization = request.headers.get('Authorization');
  return authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : null;
}

/**
 * @swagger
 * /api/v1/live-game/avatar-urls:
 *   post:
 *     tags: [Game Sessions]
 *     summary: Resolve live-game avatar object keys to temporary read URLs
 *     security: [{ SessionCookie: [], BearerAuth: [] }, { BearerAuth: [] }]
 *     description: User tokens also require the matching user session; guest tokens are room-bound bearer credentials.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [sessionId, objectKeys]
 *     responses:
 *       200: { description: Signed avatar URLs }
 *       400: { description: Invalid request }
 *       401: { description: Missing or invalid avatar access token }
 *       403: { description: Token does not belong to the user or game session }
 */
export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return NextResponse.json(
      { code: 'VALIDATION_ERROR', message: 'Invalid avatar URL request.' },
      { status: 400 }
    );
  }

  const token = bearerToken(request);
  const secret = process.env.LIVE_GAME_TICKET_SECRET;
  if (!token || !secret) {
    return NextResponse.json(
      {
        code: 'UNAUTHORIZED',
        message: 'A valid avatar access token is required.',
      },
      { status: 401 }
    );
  }

  try {
    const claims = await verifyLiveGameAvatarAccessToken(token, secret);
    const session = await auth.api.getSession({ headers: await headers() });
    if (
      claims.sessionId !== parsed.data.sessionId ||
      (claims.identityKind === 'USER' && claims.sub !== session?.user.id)
    ) {
      return NextResponse.json(
        {
          code: 'FORBIDDEN',
          message: 'Avatar access is not valid for this Game Session.',
        },
        { status: 403 }
      );
    }
  } catch {
    return NextResponse.json(
      {
        code: 'UNAUTHORIZED',
        message: 'A valid avatar access token is required.',
      },
      { status: 401 }
    );
  }

  const objectKeys = [...new Set(parsed.data.objectKeys)];
  if (objectKeys.some((objectKey) => !isAvatarObjectKey(objectKey))) {
    return NextResponse.json(
      { code: 'VALIDATION_ERROR', message: 'Avatar object keys are invalid.' },
      { status: 400 }
    );
  }

  const data = await Promise.all(
    objectKeys.map(async (objectKey) => ({
      objectKey,
      signedUrl: await createAvatarReadSignedUrl({ objectKey }),
    }))
  );
  return NextResponse.json(
    { data },
    { headers: { 'Cache-Control': 'private, no-store' } }
  );
}
