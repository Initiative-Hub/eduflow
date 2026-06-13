import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/middlewares';
import { CourseService } from '@/services/CourseService';

export const GET = withAuth(async (_req, sessionData) => {
  try {
    const courses = await CourseService.getJoinedCourses(sessionData.user.id);
    return NextResponse.json(courses);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
});
