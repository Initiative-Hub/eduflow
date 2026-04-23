import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth, withRoles } from '@/lib/api/middlewares';
import { CourseService } from '@/services/CourseService';

const patchCourseSchema = z.object({
  isPublished: z.boolean(),
});

export const GET = withAuth(async (_req, sessionData, { params }) => {
  try {
    const { courseId } = await params;
    const userId = sessionData.user.id;
    const course = await CourseService.getCourseById(courseId, userId);

    return NextResponse.json(course);
  } catch (error: any) {
    if (error.message === 'Course not found') {
      return NextResponse.json(
        { message: 'Course not found' },
        { status: 404 }
      );
    }
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
});
export const PATCH = withAuth(
  withRoles(['TEACHER'], async (req, sessionData, { params }) => {
    try {
      const userId = sessionData.user.id;
      const { courseId } = await params;

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
      console.error('Update course error:', error);
      return NextResponse.json(
        { message: 'Internal Server Error' },
        { status: 500 }
      );
    }
  })
);
