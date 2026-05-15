import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/api/middlewares';
import { CourseService } from '@/services/CourseService';
import { StorageService } from '@/services/StorageService';

const updateEntrySchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  parentId: z.string().uuid().nullable().optional(),
});

export const PATCH = withAuth(async (req, session, { params }) => {
  try {
    const { courseId, fileId } = await params;
    const body = await req.json();
    const parsed = updateEntrySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Invalid payload', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await CourseService.updateEntry({
      userId: session.user.id,
      courseId,
      fileId,
      name: parsed.data.name,
      parentId: parsed.data.parentId,
    });

    return NextResponse.json({ data: result });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
});
