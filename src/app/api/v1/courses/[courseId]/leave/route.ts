import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/middlewares';
import { CourseSettingsService } from '@/services/CourseSettingsService';
import {
  courseParamsSchema,
  mapCourseActionError,
} from '../course-route-utils';

/**
 * @swagger
 * /api/v1/courses/{courseId}/leave:
 *   post:
 *     tags:
 *       - Courses
 *     summary: Leave a course
 *     security:
 *       - SessionCookie: []
 */
export const POST = withAuth(async (_req, sessionData, { params }) => {
  try {
    const parsedParams = courseParamsSchema.safeParse(await params);

    if (!parsedParams.success) {
      return NextResponse.json(
        { message: 'Invalid request', details: parsedParams.error.flatten() },
        { status: 400 }
      );
    }

    const result = await CourseSettingsService.leaveCourse({
      courseId: parsedParams.data.courseId,
      currentUserId: sessionData.user.id,
    });

    return NextResponse.json(result);
  } catch (error) {
    return mapCourseActionError(error);
  }
});
