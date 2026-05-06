import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { ChatPersistenceService } from '@/services/ChatPersistenceService';

const listChatsQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * @swagger
 * /api/chat/list:
 *   get:
 *     tags:
 *       - Chat
 *     summary: List chats for the current user or guest session
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *     responses:
 *       200:
 *         description: Chat list and pagination metadata
 *       400:
 *         description: Invalid query params
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const parsed = listChatsQuerySchema.safeParse({
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

    const [cookieStore, session] = await Promise.all([
      cookies(),
      auth.api.getSession({ headers: await headers() }),
    ]);
    const guestId = cookieStore.get('guest_session')?.value;

    const result = await ChatPersistenceService.listChats({
      userId: session?.user?.id,
      guestId,
      search: parsed.data.search,
      limit: parsed.data.limit,
      offset: parsed.data.offset,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ message }, { status: 500 });
  }
}
