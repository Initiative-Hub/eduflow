import { z } from 'zod';
import { AiChatType } from '@/generated/prisma';
import { getChatOwner } from '@/lib/api/guest-session';
import { ChatPersistenceService } from '@/services/ChatPersistenceService';

const listQuerySchema = z.object({
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * @swagger
 * /api/v1/ai/study/list:
 *   get:
 *     tags:
 *       - Study
 *     summary: List Study Assistant sessions
 *     responses:
 *       200:
 *         description: List of study sessions
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const parsed = listQuerySchema.safeParse(
      Object.fromEntries(searchParams.entries())
    );

    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'Invalid query params' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { userId, guestId } = await getChatOwner();

    if (!userId && !guestId) {
      return new Response(JSON.stringify({ error: 'Missing guest session' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = await ChatPersistenceService.listChats({
      userId,
      guestId,
      chatType: AiChatType.STUDY_ASSISTANT,
      search: parsed.data.search,
      limit: parsed.data.limit,
      offset: parsed.data.offset,
    });

    return new Response(JSON.stringify(result), {
      status: 200,
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
