import { NextResponse } from 'next/server';
import { z } from 'zod';
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

export const POST = withAuth(async (req, session, context) => {
  try {
    const params = routeParamsSchema.safeParse(await context.params);
    if (!params.success) {
      return NextResponse.json(
        { message: 'Invalid course id', details: params.error.flatten() },
        { status: 400 }
      );
    }

    const body = await req.json();
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
