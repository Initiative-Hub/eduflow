import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getChatOwner } from '@/lib/api/guest-session';
import { StudyShareService } from '@/services/StudyShareService';

const shareInteractiveContentSchema = z.object({
  messageId: z.string().trim().min(1),
  contentIndex: z.number().int().min(0).default(0),
});

/**
 * @swagger
 * /api/v1/ai/study/{chatId}/share/interactive-content:
 *   post:
 *     tags:
 *       - Study
 *     summary: Create a public share link for generated interactive content
 *     responses:
 *       200:
 *         description: Share link created
 *       400:
 *         description: Invalid request payload
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Interactive content not found
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const [{ chatId }, body] = await Promise.all([params, req.json()]);
    const parsedBody = shareInteractiveContentSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        {
          error: 'Invalid request payload',
          message: 'Invalid request payload',
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
          message: 'Sign in to share interactive content.',
        },
        { status: 401 }
      );
    }

    const sharedResource =
      await StudyShareService.createInteractiveContentShare({
        chatId,
        userId,
        messageId: parsedBody.data.messageId,
        contentIndex: parsedBody.data.contentIndex,
      });

    if (!sharedResource) {
      return NextResponse.json(
        {
          error: 'Interactive content not found',
          message: 'Interactive content not found.',
        },
        { status: 404 }
      );
    }

    const shareUrl = new URL(
      `/share/study/interactive/${sharedResource.id}`,
      req.url
    ).toString();

    return NextResponse.json({
      shareId: sharedResource.id,
      shareUrl,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json({ error: message, message }, { status: 500 });
  }
}
