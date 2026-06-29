import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermissions } from '@/lib/api/middlewares';
import { PLATFORM_PERMISSION } from '@/lib/permissions/permission-keys';
import { STORAGE_MAX_FILE_SIZE_BYTES } from '@/lib/storage/file-storage';
import { StorageService } from '@/services/StorageService';

const initUploadSchema = z.object({
  parentId: z.string().uuid().nullable().optional(),
  folderPath: z.array(z.string().trim().min(1).max(180)).max(10).optional(),
  fileName: z.string().trim().min(1).max(255),
  contentType: z.string().trim().min(1).max(255),
  size: z.number().int().positive().max(STORAGE_MAX_FILE_SIZE_BYTES),
});

/**
 * @swagger
 * /api/v1/storage/init-upload:
 *   post:
 *     tags:
 *       - Storage
 *     summary: Initialize a file upload
 *     security:
 *       - SessionCookie: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fileName, contentType, size]
 *             properties:
 *               parentId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *               folderPath:
 *                 type: array
 *                 items:
 *                   type: string
 *               fileName:
 *                 type: string
 *               contentType:
 *                 type: string
 *               size:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Upload URL and pending file metadata
 *       400:
 *         description: Invalid request payload
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Parent folder not found
 *       500:
 *         description: Internal server error
 *
 */
export const POST = withPermissions(
  [PLATFORM_PERMISSION.PERSONAL_FILES_MANAGE],
  async (req, session) => {
    try {
      const body = await req.json();
      const parsed = initUploadSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          {
            message: 'Invalid request payload',
            details: parsed.error.flatten(),
          },
          { status: 400 }
        );
      }

      const upload = await StorageService.initializeUpload({
        userId: session.user.id,
        parentId: parsed.data.parentId ?? null,
        folderPath: parsed.data.folderPath,
        fileName: parsed.data.fileName,
        contentType: parsed.data.contentType,
        fileSize: parsed.data.size,
      });

      return NextResponse.json({
        data: {
          fileId: upload.id,
          path: upload.objectKey,
          bucket: upload.bucket,
          status: upload.status,
          uploadUrl: upload.uploadUrl,
          uploadHeaders: upload.uploadHeaders,
        },
      });
    } catch (error: any) {
      if (error?.message === 'Parent folder not found') {
        return NextResponse.json({ message: error.message }, { status: 404 });
      }

      if (error?.message === 'File size exceeds inventory upload limit') {
        return NextResponse.json({ message: error.message }, { status: 413 });
      }

      return NextResponse.json(
        { message: error?.message || 'Internal Server Error' },
        { status: 500 }
      );
    }
  }
);
