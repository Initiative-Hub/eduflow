import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/api/middlewares';
import { CourseService } from '@/services/CourseService';
import { StorageService } from '@/services/StorageService';

const confirmUploadSchema = z.object({
  fileId: z.string().uuid(),
});

export const POST = withAuth(async (req, session, { params }) => {
  try {
    const { courseId } = await params;
    const body = await req.json();
    const parsed = confirmUploadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Invalid payload', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await CourseService.confirmUpload(
      courseId,
      session.user.id,
      parsed.data.fileId
    );

    return NextResponse.json({ data: result });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
});
