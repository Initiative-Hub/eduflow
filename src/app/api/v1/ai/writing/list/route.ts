import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AiChatType } from '@/generated/prisma';
import { getChatOwner } from '@/lib/api/guest-session';
import { ChatPersistenceService } from '@/services/ChatPersistenceService';

const listWritingSessionsQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * @swagger
 * /api/v1/ai/writing/list:
 *   get:
 *     tags:
 *       - Writing
 *     summary: List writing assistant sessions for the current user or guest session
 *     responses:
 *       200:
 *         description: Writing session list and pagination metadata
 *       400:
 *         description: Invalid query params
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const parsed = listWritingSessionsQuerySchema.safeParse({
      search: searchParams.get('search') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
      offset: searchParams.get('offset') ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Invalid query params', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { userId, guestId } = await getChatOwner();

    const result = await ChatPersistenceService.listChats({
      userId,
      guestId,
      search: parsed.data.search,
      limit: parsed.data.limit,
      offset: parsed.data.offset,
      chatType: AiChatType.WRITING_ASSISTANT,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ message }, { status: 500 });
  }
}
