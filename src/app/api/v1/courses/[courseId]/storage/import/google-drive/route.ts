import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/api/middlewares';
import { buildStorageErrorResponse } from '@/lib/storage/storage-error-response';
import { CourseService } from '@/services/CourseService';
import { GoogleDriveImportService } from '@/services/google-drive/GoogleDriveImportService';

const routeParamsSchema = z.object({
  courseId: z.string().uuid(),
});

const importGoogleDriveSchema = z.object({
  fileId: z.string().trim().min(1).max(255),
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
    const parsed = importGoogleDriveSchema.safeParse(body);
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

    const imported = await GoogleDriveImportService.importFile({
      courseId: params.data.courseId,
      fileId: parsed.data.fileId,
      parentId: parsed.data.parentId ?? null,
      userId: session.user.id,
    });

    return NextResponse.json({ data: imported }, { status: 201 });
  } catch (error: any) {
    if (error?.message === 'Google Drive is not connected.') {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }

    return buildStorageErrorResponse(error);
  }
});
