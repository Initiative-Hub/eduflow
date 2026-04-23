import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth, withRoles } from '@/lib/api/middlewares';
import { CourseService } from '@/services/CourseService';

export const GET = withAuth(async (_req, sessionData) => {
  try {
    const userId = sessionData.user.id;
    const courses = await CourseService.getCoursesByTeacher(userId);

    return NextResponse.json(courses);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
});

const createCourseSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
});

export const POST = withAuth(
  withRoles(['TEACHER', 'ADMIN'], async (req, sessionData) => {
    try {
      const userId = sessionData.user.id;

      const body = await req.json();
      const parsed = createCourseSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { message: 'Invalid data', errors: parsed.error.format() },
          { status: 400 }
        );
      }

      const course = await CourseService.createCourse({
        teacherId: userId,
        title: parsed.data.title,
        description: parsed.data.description,
      });

      return NextResponse.json(course, { status: 201 });
    } catch (error: any) {
      console.error('Create course error:', error);
      return NextResponse.json(
        { message: 'Internal Server Error' },
        { status: 500 }
      );
    }
  })
);
