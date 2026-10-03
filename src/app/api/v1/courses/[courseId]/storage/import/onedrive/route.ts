import { NextResponse } from 'next/server';
import * as z from 'zod';
import { withAuth } from '@/lib/api/middlewares';
import { buildStorageErrorResponse } from '@/lib/storage/storage-error-response';
import { oneDriveItemRefSchema } from '@/lib/validations/onedrive-export.schema';
import { CourseService } from '@/services/CourseService';
import { OneDriveImportService } from '@/services/onedrive/OneDriveImportService';

const routeParamsSchema = z.object({
  courseId: z.string().uuid(),
});

const importOneDriveSchema = oneDriveItemRefSchema.extend({
  parentId: z.string().uuid().nullable().optional(),
});

export const maxDuration = 300;

/**
 * @swagger
 * /api/v1/courses/{courseId}/storage/import/onedrive:
 *   post:
 *     summary: Import a OneDrive file into course storage
 *     description: Requires course membership and course file management permission. Returns the inventory entry under data.
 *     security:
 *       - SessionCookie: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: false
 *             required: [driveId, itemId]
 *             properties:
 *               driveId:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 255
 *               itemId:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 255
 *               parentId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *     responses:
 *       201:
 *         description: The OneDrive file was imported into inventory.
 *       400:
 *         description: Malformed JSON or invalid request parameters.
 *       401:
 *         description: Authentication is required.
 *       403:
 *         description: The user lacks permission or the selected destination is not writable.
 *       404:
 *         description: The source file or parent folder was not found.
 *       409:
 *         description: OneDrive must be connected, or the destination or storage operation has a conflict.
 *       413:
 *         description: The file exceeds the 50 MB limit.
 *       500:
 *         description: The server or provider operation failed.
 */
export const POST = withAuth(async (req, session, context) => {
  try {
    const params = routeParamsSchema.safeParse(await context.params);
    if (!params.success) {
      return NextResponse.json(
        { message: 'Invalid course id', details: params.error.flatten() },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = importOneDriveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Invalid payload', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    if (
      !(await CourseService.isMember(params.data.courseId, session.user.id))
    ) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const imported = await OneDriveImportService.importFile({
      courseId: params.data.courseId,
      driveId: parsed.data.driveId,
      itemId: parsed.data.itemId,
      parentId: parsed.data.parentId ?? null,
      userId: session.user.id,
    });

    return NextResponse.json({ data: imported }, { status: 201 });
  } catch (error: any) {
    if (error?.message === 'OneDrive is not connected.') {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }

    return buildStorageErrorResponse(error);
  }
});
