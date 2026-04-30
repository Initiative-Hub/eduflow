import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/api/middlewares';
import { StorageService } from '@/services/StorageService';

const shareQuerySchema = z.object({
  fileId: z.string().uuid(),
  expiresIn: z.coerce
    .number()
    .int()
    .min(60)
    .max(60 * 60 * 24 * 7)
    .optional(),
});

/**
 * @swagger
 * /api/v1/storage/share:
 *   get:
 *     tags:
 *       - Storage
 *     summary: Create a share URL for a file
 *     security:
 *       - SessionCookie: []
 *     parameters:
 *       - in: query
 *         name: fileId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: expiresIn
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 60
 *           maximum: 604800
 *     responses:
 *       200:
 *         description: Share URL created
 *       400:
 *         description: Invalid query params
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: File not found
 *       500:
 *         description: Internal server error
 *
 */
export const GET = withAuth(async (req, session) => {
  try {
    const { searchParams } = new URL(req.url);
    const parsed = shareQuerySchema.safeParse({
      fileId: searchParams.get('fileId') ?? undefined,
      expiresIn: searchParams.get('expiresIn') ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Invalid query params', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const signedUrl = await StorageService.createShareUrl({
      userId: session.user.id,
      fileId: parsed.data.fileId,
      expiresInSeconds: parsed.data.expiresIn,
    });

    return NextResponse.json({ data: { signedUrl } });
  } catch (error: any) {
    if (error?.message === 'File not found') {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }

    return NextResponse.json(
      { message: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
});
