import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/api/middlewares';
import { CourseService } from '@/services/CourseService';
import { StorageService } from '@/services/StorageService';

const deleteFilesSchema = z.object({
  fileIds: z.array(z.string().uuid()),
});

export const DELETE = withAuth(async (req, session, { params }) => {
  try {
    const { courseId } = await params;
    const body = await req.json();
    const parsed = deleteFilesSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Invalid payload', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await CourseService.deleteFiles(
      courseId,
      session.user.id,
      parsed.data.fileIds
    );

    return NextResponse.json({ data: result });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
});
