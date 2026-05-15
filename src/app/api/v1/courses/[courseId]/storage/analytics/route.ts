import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/middlewares';
import { CourseService } from '@/services/CourseService';
import { StorageService } from '@/services/StorageService';

export const GET = withAuth(async (req, session, { params }) => {
  try {
    const { courseId } = await params;

    const result = await CourseService.getAnalytics(courseId, session.user.id);

    return NextResponse.json({ data: result });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
});
