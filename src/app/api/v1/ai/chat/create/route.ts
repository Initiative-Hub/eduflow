import { z } from 'zod';
import { getChatOwner } from '@/lib/api/guest-session';
import { ChatPersistenceService } from '@/services/ChatPersistenceService';

const createChatSchema = z.object({
  firstMessage: z.string().min(1),
});

/**
 * @swagger
 * /api/v1/ai/chat/create:
 *   post:
 *     tags:
 *       - Chat
 *     summary: Create a chat session
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [firstMessage]
 *             properties:
 *               firstMessage:
 *                 type: string
 *     responses:
 *       201:
 *         description: Chat created
 *       400:
 *         description: Invalid request payload
 *       500:
 *         description: Internal server error
 *
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsedBody = createChatSchema.safeParse(body);

    if (!parsedBody.success) {
      return new Response(
        JSON.stringify({
          error: 'Invalid request payload',
          details: parsedBody.error.flatten(),
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { userId, guestId } = await getChatOwner({ createGuest: true });

    const { chatId } = await ChatPersistenceService.createChat({
      userId,
      guestId,
      firstMessage: parsedBody.data.firstMessage,
    });

    return new Response(JSON.stringify({ chatId }), {
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
