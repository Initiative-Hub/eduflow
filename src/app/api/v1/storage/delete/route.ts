import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermissions } from '@/lib/api/middlewares';
import { PLATFORM_PERMISSION } from '@/lib/permissions/permission-keys';
import { StorageService } from '@/services/StorageService';
import { buildStorageErrorResponse } from '@/lib/storage/storage-error-response';

const deleteSchema = z.object({
  fileIds: z.array(z.string().uuid()).min(1).max(100),
});

/**
 * @swagger
 * /api/v1/storage/delete:
 *   delete:
 *     tags:
 *       - Storage
 *     summary: Delete files or folders
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
 *     responses:
 *       200:
 *         description: Delete result
 *       400:
 *         description: Invalid request payload
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 *
 */
export const DELETE = withPermissions(
  [PLATFORM_PERMISSION.PERSONAL_FILES_MANAGE],
  async (req, session) => {
    try {
      const body = await req.json();
      const parsed = deleteSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          {
            message: 'Invalid request payload',
            details: parsed.error.flatten(),
          },
          { status: 400 }
        );
      }

      const result = await StorageService.deleteEntries({
        userId: session.user.id,
        fileIds: parsed.data.fileIds,
      });

      return NextResponse.json({ data: result });
    } catch (error: any) {
      return buildStorageErrorResponse(error);
    }
  }
);
