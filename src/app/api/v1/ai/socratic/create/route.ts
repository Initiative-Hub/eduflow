import * as z from 'zod';
import { AiChatType } from '@/generated/prisma';
import { getChatOwner } from '@/lib/api/guest-session';
import { socraticDisciplineSchema } from '@/lib/validations/socratic.schema';
import { ChatPersistenceService } from '@/services/ChatPersistenceService';

const createSocraticSessionSchema = z.object({
  firstMessage: z.string().trim().min(1),
  discipline: socraticDisciplineSchema,
});

/**
 * @swagger
 * /api/v1/ai/socratic/create:
 *   post:
 *     tags:
 *       - Socratic
 *     summary: Create a Socratic tutor session
 *     responses:
 *       201:
 *         description: Socratic session created
 *       400:
 *         description: Invalid request payload
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsedBody = createSocraticSessionSchema.safeParse(body);

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
      chatType: AiChatType.SOCRATIC_TUTOR,
      metadata: { discipline: parsedBody.data.discipline },
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
