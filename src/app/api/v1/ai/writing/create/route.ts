import { z } from 'zod';
import { AiChatType } from '@/generated/prisma';
import { getChatOwner } from '@/lib/api/guest-session';
import { writingToolSchema } from '@/lib/validations/writing.schema';
import { ChatPersistenceService } from '@/services/ChatPersistenceService';

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
 *     summary: Create a writing assistant session
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

    const { userId, guestId } = await getChatOwner({ createGuest: true });

    const { chatId } = await ChatPersistenceService.createChat({
      userId,
      guestId,
      firstMessage: parsedBody.data.firstMessage,
      chatType: AiChatType.WRITING_ASSISTANT,
      metadata: { writingTool: parsedBody.data.tool },
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
