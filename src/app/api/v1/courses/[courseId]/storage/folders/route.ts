import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/api/middlewares';
import { buildStorageErrorResponse } from '@/lib/storage/storage-error-response';
import { CourseService } from '@/services/CourseService';

const createFolderSchema = z.object({
  parentId: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(1).max(180),
});

export const POST = withAuth(async (req, session, { params }) => {
  try {
    const { courseId } = await params;
    const body = await req.json();
    const parsed = createFolderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Invalid payload', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const folder = await CourseService.createFolder({
      userId: session.user.id,
      courseId,
      parentId: parsed.data.parentId,
      name: parsed.data.name,
    });

    return NextResponse.json({ data: folder });
  } catch (error) {
    return buildStorageErrorResponse(error);
  }
});
