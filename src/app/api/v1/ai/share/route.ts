import { NextResponse } from 'next/server';
import { getChatOwner } from '@/lib/api/guest-session';
import { createAiChatShareSchema } from '@/lib/validations/ai-chat-share.schema';
import { AiChatShareService } from '@/services/AiChatShareService';

/**
 * @swagger
 * /api/v1/ai/share:
 *   post:
 *     tags:
 *       - AI
 *     summary: Create a public link for an AI chat
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsedBody = createAiChatShareSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        {
          error: 'Invalid request payload',
          details: parsedBody.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { userId } = await getChatOwner();

    if (!userId) {
      return NextResponse.json(
        {
          error: 'Authentication required',
          message: 'Sign in to share an AI chat.',
        },
        { status: 401 }
      );
    }

    const sharedChat = await AiChatShareService.createShare({
      ...parsedBody.data,
      userId,
    });
    if (!sharedChat) {
      return NextResponse.json(
        {
          error: 'Chat not found',
          message: 'Chat not found or access denied.',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      shareId: sharedChat.id,
      shareUrl: new URL(`/share/ai/chat/${sharedChat.id}`, req.url).toString(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
