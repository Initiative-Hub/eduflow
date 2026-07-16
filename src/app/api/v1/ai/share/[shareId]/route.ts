import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getChatOwner } from '@/lib/api/guest-session';
import { AiChatShareService } from '@/services/AiChatShareService';

const paramsSchema = z.object({
  shareId: z.uuid(),
});

type RouteContext = {
  params: Promise<{ shareId: string }>;
};

/**
 * @swagger
 * /api/v1/ai/share/{shareId}:
 *   delete:
 *     tags:
 *       - AI
 *     summary: Revoke a public AI chat link
 */
export async function DELETE(_req: Request, { params }: RouteContext) {
  const { userId } = await getChatOwner();

  if (!userId) {
    return NextResponse.json(
      { message: 'Authentication required' },
      { status: 401 }
    );
  }

  const parsedParams = paramsSchema.safeParse(await params);

  if (!parsedParams.success) {
    return NextResponse.json(
      {
        message: 'Invalid share link ID',
        details: z.treeifyError(parsedParams.error),
      },
      { status: 400 }
    );
  }

  const revoked = await AiChatShareService.revokeShare({
    shareId: parsedParams.data.shareId,
    userId,
  });

  if (!revoked) {
    return NextResponse.json(
      { message: 'Share link not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: { revoked: true } });
}
