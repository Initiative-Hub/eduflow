import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/middlewares';
import { CourseService } from '@/services/CourseService';
import { z } from 'zod';

const patchCourseSchema = z.object({
  isPublished: z.boolean(),
});

export const PATCH = withAuth([], async (req, sessionData, { params }) => {
  try {
    if (!sessionData) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const userId = sessionData.user.id;
    const { courseId } = params;

    const body = await req.json();
    const parsed = patchCourseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: 'Invalid data' }, { status: 400 });
    }

    const updatedCourse = await CourseService.togglePublish(
      courseId,
      parsed.data.isPublished,
      userId
    );

    return NextResponse.json(updatedCourse);
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }
    return NextResponse.json(
      { message: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
});
