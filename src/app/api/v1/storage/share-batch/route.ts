import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermissions } from '@/lib/api/middlewares';
import { PLATFORM_PERMISSION } from '@/lib/permissions/permission-keys';
import { StorageService } from '@/services/StorageService';

const shareBatchSchema = z.object({
  fileIds: z.array(z.string().uuid()).min(1).max(100),
  expiresIn: z.coerce
    .number()
    .int()
    .min(60)
    .max(60 * 60 * 24 * 7)
    .optional(),
});

/**
 * @swagger
 * /api/v1/storage/share-batch:
 *   post:
 *     tags:
 *       - Storage
 *     summary: Create share URLs for multiple files
 *     security:
 *       - SessionCookie: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fileIds]
 *             properties:
 *               fileIds:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 100
 *                 items:
 *                   type: string
 *                   format: uuid
 *               expiresIn:
 *                 type: integer
 *                 minimum: 60
 *                 maximum: 604800
 *     responses:
 *       200:
 *         description: Share URLs created
 *       400:
 *         description: Invalid request payload
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 *
 */
export const POST = withPermissions(
  [PLATFORM_PERMISSION.PERSONAL_FILES_MANAGE],
  async (req, session) => {
    try {
      const body = await req.json();
      const parsed = shareBatchSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          {
            message: 'Invalid request payload',
            details: parsed.error.flatten(),
          },
          { status: 400 }
        );
      }

      const signed = await StorageService.createShareUrlsBatch({
        userId: session.user.id,
        fileIds: parsed.data.fileIds,
        expiresInSeconds: parsed.data.expiresIn,
      });

      return NextResponse.json({ data: signed });
    } catch (error: any) {
      return NextResponse.json(
        { message: error?.message || 'Internal Server Error' },
        { status: 500 }
      );
    }
  }
);
