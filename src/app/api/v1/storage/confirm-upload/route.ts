import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermissions } from '@/lib/api/middlewares';
import { PLATFORM_PERMISSION } from '@/lib/permissions/permission-keys';
import { StorageService } from '@/services/StorageService';

const confirmUploadSchema = z.object({
  fileId: z.string().uuid(),
  checksumSha256: z.string().trim().max(255).optional(),
  etag: z.string().trim().max(255).optional(),
});

/**
 * @swagger
 * /api/v1/storage/confirm-upload:
 *   post:
 *     tags:
 *       - Storage
 *     summary: Confirm a completed file upload
 *     security:
 *       - SessionCookie: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fileId]
 *             properties:
 *               fileId:
 *                 type: string
 *                 format: uuid
 *               checksumSha256:
 *                 type: string
 *               etag:
 *                 type: string
 *     responses:
 *       201:
 *         description: Uploaded file confirmed
 *       400:
 *         description: Invalid request payload
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: File or uploaded object not found
 *       500:
 *         description: Internal server error
 *
 */
export const POST = withPermissions(
  [PLATFORM_PERMISSION.PERSONAL_FILES_MANAGE],
  async (req, session) => {
    try {
      const body = await req.json();
      const parsed = confirmUploadSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          {
            message: 'Invalid request payload',
            details: parsed.error.flatten(),
          },
          { status: 400 }
        );
      }

      const uploaded = await StorageService.confirmUpload({
        userId: session.user.id,
        fileId: parsed.data.fileId,
        checksumSha256: parsed.data.checksumSha256,
      });

      return NextResponse.json({ data: uploaded }, { status: 201 });
    } catch (error: any) {
      if (
        error?.message === 'File not found' ||
        error?.message === 'Uploaded object not found' ||
        error?.message ===
          'Uploaded object not found. Database entry rolled back.'
      ) {
        return NextResponse.json({ message: error.message }, { status: 404 });
      }

      if (
        error?.message === 'Uploaded object exceeds inventory upload limit.'
      ) {
        return NextResponse.json({ message: error.message }, { status: 413 });
      }

      if (
        error?.message ===
        'Uploaded object size mismatch. Database entry rolled back.'
      ) {
        return NextResponse.json({ message: error.message }, { status: 400 });
      }

      return NextResponse.json(
        { message: error?.message || 'Internal Server Error' },
        { status: 500 }
      );
    }
  }
);
