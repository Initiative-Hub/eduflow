import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/api/middlewares';
import { CourseSettingsService } from '@/services/CourseSettingsService';
import {
  courseParamsSchema,
  mapCourseActionError,
} from '../course-route-utils';

const transferOwnershipSchema = z.object({
  newOwnerUserId: z.string().uuid(),
});

/**
 * @swagger
 * /api/v1/courses/{courseId}/ownership:
 *   patch:
 *     tags:
 *       - Courses
 *     summary: Transfer course ownership
 *     security:
 *       - SessionCookie: []
 */
export const PATCH = withAuth(async (req, sessionData, { params }) => {
  try {
    const parsedParams = courseParamsSchema.safeParse(await params);

    if (!parsedParams.success) {
      return NextResponse.json(
        { message: 'Invalid request', details: parsedParams.error.flatten() },
        { status: 400 }
      );
    }

    const parsedBody = transferOwnershipSchema.safeParse(await req.json());

    if (!parsedBody.success) {
      return NextResponse.json(
        { message: 'Invalid request', details: parsedBody.error.flatten() },
        { status: 400 }
      );
    }

    const result = await CourseSettingsService.transferOwnership({
      courseId: parsedParams.data.courseId,
      currentUserId: sessionData.user.id,
      newOwnerUserId: parsedBody.data.newOwnerUserId,
    });

    return NextResponse.json(result);
  } catch (error) {
    return mapCourseActionError(error);
  }
});
