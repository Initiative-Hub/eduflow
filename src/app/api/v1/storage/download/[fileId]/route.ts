import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermissions } from '@/lib/api/middlewares';
import { PLATFORM_PERMISSION } from '@/lib/permissions/permission-keys';
import { StorageService } from '@/services/StorageService';

const routeParamsSchema = z.object({
  fileId: z.string().uuid(),
});

/**
 * @swagger
 * /api/v1/storage/download/{fileId}:
 *   get:
 *     tags:
 *       - Storage
 *     summary: Download a stored file
 *     security:
 *       - SessionCookie: []
 *     parameters:
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: File content
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Invalid file id
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: File not found
 *       500:
 *         description: Internal server error
 *
 */
export const GET = withPermissions(
  [PLATFORM_PERMISSION.PERSONAL_FILES_MANAGE],
  async (_req, session, context) => {
    try {
      const params = routeParamsSchema.safeParse(await context.params);
      if (!params.success) {
        return NextResponse.json(
          { message: 'Invalid file id' },
          { status: 400 }
        );
      }

      const downloaded = await StorageService.getDownloadPayload({
        userId: session.user.id,
        fileId: params.data.fileId,
      });

      const body = downloaded.bytes.buffer.slice(
        downloaded.bytes.byteOffset,
        downloaded.bytes.byteOffset + downloaded.bytes.byteLength
      ) as ArrayBuffer;

      return new NextResponse(body, {
        headers: {
          'Content-Type': downloaded.contentType,
          'Content-Disposition': `attachment; filename="${downloaded.fileName}"`,
        },
      });
    } catch (error: any) {
      if (error?.message === 'File not found') {
        return NextResponse.json({ message: error.message }, { status: 404 });
      }

      return NextResponse.json(
        { message: error?.message || 'Internal Server Error' },
        { status: 500 }
      );
    }
  }
);
