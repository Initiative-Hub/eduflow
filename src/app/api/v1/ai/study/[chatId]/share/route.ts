import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getChatOwner } from '@/lib/api/guest-session';
import { StudyShareService } from '@/services/StudyShareService';

const chatIdSchema = z.uuid();

/**
 * @swagger
 * /api/v1/ai/study/{chatId}/share:
 *   post:
 *     tags:
 *       - Study
 *     summary: Create a public share link for a Study Assistant chat
 *     responses:
 *       200:
 *         description: Share link created
 *       400:
 *         description: Invalid chat ID
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Study chat not found
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const { chatId } = await params;
    const parsedChatId = chatIdSchema.safeParse(chatId);

    if (!parsedChatId.success) {
      return NextResponse.json({
        error: 'Invalid chat ID',
        message: 'Invalid chat ID',
      });
    }

    const { userId } = await getChatOwner();

    if (!userId) {
      return NextResponse.json(
        {
          error: 'Authentication required',
          message: 'Sign in to share a study chat.',
        },
        { status: 401 }
      );
    }

    const sharedChat = await StudyShareService.createStudyChatShare({
      chatId: parsedChatId.data,
      userId,
    });

    if (!sharedChat) {
      return NextResponse.json(
        {
          error: 'Study chat not found',
          message: 'Study chat not found.',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      shareId: sharedChat.id,
      shareUrl: new URL(
        `/share/study/chat/${sharedChat.id}`,
        req.url
      ).toString(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json({ error: message, message }, { status: 500 });
  }
}
