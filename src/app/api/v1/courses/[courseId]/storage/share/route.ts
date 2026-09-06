import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/middlewares';
import { CourseService } from '@/services/CourseService';

export const GET = withAuth(async (req, session, { params }) => {
  try {
    const { courseId } = await params;
    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get('fileId');

    if (!fileId) {
      return NextResponse.json(
        { message: 'fileId is required' },
        { status: 400 }
      );
    }

    const result = await CourseService.createShareUrl(
      courseId,
      session.user.id,
      fileId
    );

    return NextResponse.json({ data: result });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
});
