import type { UIMessage } from 'ai';
import { NextResponse } from 'next/server';
import z from 'zod';
import {
  AiChatRole,
  AiChatStatus,
  AiChatType,
  ShareResourceType,
} from '@/generated/prisma';
import { getChatOwner } from '@/lib/api/guest-session';
import { prisma } from '@/lib/prisma';
import {
  getStudyInteractiveContentParts,
  studyInteractiveContentSchema,
} from '@/utils/study-interactive-content';

const shareInteractiveContentSchema = z.object({
  messageId: z.string().trim().min(1),
  contentIndex: z.number().min(0).default(0),
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

    const message = await prisma.aiChatMessage.findFirst({
      where: {
        id: parsedBody.data.messageId,
        chatId,
        role: AiChatRole.ASSISTANT,
        chat: {
          userId,
          type: AiChatType.STUDY_ASSISTANT,
          status: AiChatStatus.ACTIVE,
          deletedAt: null,
        },
      },
      select: {
        id: true,
        parts: true,
      },
    });

    if (!message) {
      return NextResponse.json(
        {
          error: 'Message not found or access denied',
          message: 'Message not found or access denied.',
        },
        { status: 404 }
      );
    }

    const interactiveContents = getStudyInteractiveContentParts({
      id: message.id,
      role: 'assistant',
      parts: Array.isArray(message.parts) ? message.parts : [],
    } as UIMessage);

    const content = interactiveContents[parsedBody.data.contentIndex];
    const parsedContent = studyInteractiveContentSchema.safeParse(content);

    if (!parsedContent.success) {
      return NextResponse.json(
        {
          error: 'Interactive content not found',
          message: 'Interactive content not found.',
        },
        { status: 404 }
      );
    }

    const sharedResource = await prisma.sharedResource.create({
      data: {
        ownerUserId: userId,
        resourceType: ShareResourceType.STUDY_INTERACTIVE_CONTENT,
        sourceChatId: chatId,
        sourceMessageId: message.id,
        title: parsedContent.data.title,
        description: parsedContent.data.description,
        payload: parsedContent.data,
      },
      select: {
        id: true,
      },
    });

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
