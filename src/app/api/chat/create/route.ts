import { cookies } from 'next/headers';
import { z } from 'zod';
import { CacheService } from '@/services/CacheService';
import { buildNewChatData } from '@/services/chat/chat-session';

const createChatSchema = z.object({
  firstMessage: z.string().optional(),
});

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

    const cookieStore = await cookies();
    const guestSession = cookieStore.get('guest_session');
    const previousGuestId = guestSession?.value;

    if (previousGuestId) {
      await CacheService.deleteCache(`guest_usage:${previousGuestId}`);
    }

    const guestId = `guest_${crypto.randomUUID()}`;
    cookieStore.set('guest_session', guestId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24,
      path: '/',
    });

    const chatId = `chat_${crypto.randomUUID()}`;
    const chatData = buildNewChatData({
      guestId,
      firstMessage: parsedBody.data.firstMessage ?? '',
    });

    await CacheService.setCache(chatId, chatData, { ttlSeconds: 86400 });

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
