import { cookies } from 'next/headers';
import { z } from 'zod';
import { writingToolSchema } from '@/lib/validations/writing.schema';
import { CacheService } from '@/services/CacheService';
import { buildNewChatData } from '@/utils/chat-session';

const createWritingSessionSchema = z.object({
  firstMessage: z.string().min(1),
  tool: writingToolSchema,
});

/**
 * @swagger
 * /api/v1/ai/writing/create:
 *   post:
 *     tags:
 *       - Writing
 *     summary: Create a guest writing session
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [firstMessage, tool]
 *             properties:
 *               firstMessage:
 *                 type: string
 *               tool:
 *                 type: string
 *     responses:
 *       201:
 *         description: Writing session created
 *       400:
 *         description: Invalid request payload
 *       500:
 *         description: Internal server error
 *
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsedBody = createWritingSessionSchema.safeParse(body);

    if (!parsedBody.success) {
      return new Response(
        JSON.stringify({
          error: 'Invalid request payload',
          details: parsedBody.error.flatten(),
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const cookieStore = await cookies();
    const guestSession = cookieStore.get('guest_session');
    const previousGuestId = guestSession?.value;

    let guestId: string;

    if (previousGuestId) {
      guestId = previousGuestId;
    } else {
      guestId = `guest_${crypto.randomUUID()}`;
      cookieStore.set('guest_session', guestId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24,
        path: '/',
      });
    }

    const sessionId = `writing_${crypto.randomUUID()}`;

    const writingData = buildNewChatData({
      guestId,
      firstMessage: parsedBody.data.firstMessage,
    });

    await CacheService.setCache(sessionId, writingData, { ttlSeconds: 86400 });

    return new Response(JSON.stringify({ sessionId }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
