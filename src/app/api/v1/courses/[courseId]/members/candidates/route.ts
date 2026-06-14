import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/api/middlewares';
import { getCoursePermissions } from '@/lib/permissions/course-permission';
import { COURSE_PERMISSION } from '@/lib/permissions/permission-keys';
import { CourseMemberService } from '@/services/CourseMemberService';
import { mapCourseMemberError } from '../course-member-route-utils';

const courseParamsSchema = z.object({
  courseId: z.string().uuid(),
});

const candidateListQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * @swagger
 * /api/v1/courses/{courseId}/members/candidates:
 *   get:
 *     tags:
 *       - Courses
 *     summary: List users that can be added to a course
 *     security:
 *       - SessionCookie: []
 */
export const GET = withAuth(async (req, sessionData, { params }) => {
  try {
    const parsedParams = courseParamsSchema.safeParse(await params);

    if (!parsedParams.success) {
      return NextResponse.json(
        { message: 'Invalid request', details: parsedParams.error.flatten() },
        { status: 400 }
      );
    }

    const permissions = await getCoursePermissions(
      sessionData.user.id,
      parsedParams.data.courseId
    );

    if (
      permissions.withoutPermission(COURSE_PERMISSION.COURSE_MEMBERS_MANAGE)
    ) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const parsedQuery = candidateListQuerySchema.safeParse({
      search: searchParams.get('search') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
      offset: searchParams.get('offset') ?? undefined,
    });

    if (!parsedQuery.success) {
      return NextResponse.json(
        { message: 'Invalid request', details: parsedQuery.error.flatten() },
        { status: 400 }
      );
    }

    const result = await CourseMemberService.listCandidates({
      courseId: parsedParams.data.courseId,
      search: parsedQuery.data.search,
      limit: parsedQuery.data.limit,
      offset: parsedQuery.data.offset,
    });

    return NextResponse.json(result);
  } catch (error) {
    return mapCourseMemberError(error);
  }
});
