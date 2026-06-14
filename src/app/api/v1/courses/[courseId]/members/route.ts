import { NextResponse } from 'next/server';
import { z } from 'zod';
import { CourseRoleName } from '@/generated/prisma';
import { withAuth } from '@/lib/api/middlewares';
import { getCoursePermissions } from '@/lib/permissions/course-permission';
import { COURSE_PERMISSION } from '@/lib/permissions/permission-keys';
import { CourseMemberService } from '@/services/CourseMemberService';
import { mapCourseMemberError } from './course-member-route-utils';

const courseParamsSchema = z.object({
  courseId: z.string().uuid(),
});

const memberListQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  role: z
    .enum([
      'ALL',
      CourseRoleName.COURSE_OWNER,
      CourseRoleName.TEACHER,
      CourseRoleName.STUDENT,
    ])
    .default('ALL'),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const addMemberSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum([CourseRoleName.TEACHER, CourseRoleName.STUDENT]),
});

/**
 * @swagger
 * /api/v1/courses/{courseId}/members:
 *   get:
 *     tags:
 *       - Courses
 *     summary: List course members
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

    const { searchParams } = new URL(req.url);
    const parsedQuery = memberListQuerySchema.safeParse({
      search: searchParams.get('search') ?? undefined,
      role: searchParams.get('role') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
      offset: searchParams.get('offset') ?? undefined,
    });

    if (!parsedQuery.success) {
      return NextResponse.json(
        { message: 'Invalid request', details: parsedQuery.error.flatten() },
        { status: 400 }
      );
    }

    const permissions = await getCoursePermissions(
      sessionData.user.id,
      parsedParams.data.courseId
    );

    if (permissions.withoutPermission(COURSE_PERMISSION.COURSE_MEMBERS_VIEW)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const result = await CourseMemberService.listMembers({
      courseId: parsedParams.data.courseId,
      currentUserId: sessionData.user.id,
      search: parsedQuery.data.search,
      role: parsedQuery.data.role,
      limit: parsedQuery.data.limit,
      offset: parsedQuery.data.offset,
    });

    return NextResponse.json({
      ...result,
      permissions: {
        canManageMembers: permissions.containPermission(
          COURSE_PERMISSION.COURSE_MEMBERS_MANAGE
        ),
      },
    });
  } catch (error) {
    return mapCourseMemberError(error);
  }
});

/**
 * @swagger
 * /api/v1/courses/{courseId}/members:
 *   post:
 *     tags:
 *       - Courses
 *     summary: Add a course member
 *     security:
 *       - SessionCookie: []
 */
export const POST = withAuth(async (req, sessionData, { params }) => {
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

    const parsedBody = addMemberSchema.safeParse(await req.json());

    if (!parsedBody.success) {
      return NextResponse.json(
        { message: 'Invalid request', details: parsedBody.error.flatten() },
        { status: 400 }
      );
    }

    const result = await CourseMemberService.addMember({
      courseId: parsedParams.data.courseId,
      userId: parsedBody.data.userId,
      role: parsedBody.data.role,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return mapCourseMemberError(error);
  }
});
