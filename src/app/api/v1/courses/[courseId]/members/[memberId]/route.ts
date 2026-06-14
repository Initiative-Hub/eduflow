import { NextResponse } from 'next/server';
import { z } from 'zod';
import { CourseRoleName } from '@/generated/prisma';
import { withAuth } from '@/lib/api/middlewares';
import { getCoursePermissions } from '@/lib/permissions/course-permission';
import { COURSE_PERMISSION } from '@/lib/permissions/permission-keys';
import { CourseMemberService } from '@/services/CourseMemberService';
import { mapCourseMemberError } from '../course-member-route-utils';

const courseMemberParamsSchema = z.object({
  courseId: z.string().uuid(),
  memberId: z.string().uuid(),
});

const updateMemberRoleSchema = z.object({
  role: z.enum([CourseRoleName.TEACHER, CourseRoleName.STUDENT]),
});

/**
 * @swagger
 * /api/v1/courses/{courseId}/members/{memberId}:
 *   patch:
 *     tags:
 *       - Courses
 *     summary: Update a course member role
 *     security:
 *       - SessionCookie: []
 */
export const PATCH = withAuth(async (req, sessionData, { params }) => {
  try {
    const parsedParams = courseMemberParamsSchema.safeParse(await params);

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

    const parsedBody = updateMemberRoleSchema.safeParse(await req.json());

    if (!parsedBody.success) {
      return NextResponse.json(
        { message: 'Invalid request', details: parsedBody.error.flatten() },
        { status: 400 }
      );
    }

    const result = await CourseMemberService.updateMemberRole({
      courseId: parsedParams.data.courseId,
      memberId: parsedParams.data.memberId,
      role: parsedBody.data.role,
    });

    return NextResponse.json(result);
  } catch (error) {
    return mapCourseMemberError(error);
  }
});

/**
 * @swagger
 * /api/v1/courses/{courseId}/members/{memberId}:
 *   delete:
 *     tags:
 *       - Courses
 *     summary: Remove a course member
 *     security:
 *       - SessionCookie: []
 */
export const DELETE = withAuth(async (_req, sessionData, { params }) => {
  try {
    const parsedParams = courseMemberParamsSchema.safeParse(await params);

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

    const result = await CourseMemberService.removeMember({
      courseId: parsedParams.data.courseId,
      memberId: parsedParams.data.memberId,
      currentUserId: sessionData.user.id,
    });

    return NextResponse.json(result);
  } catch (error) {
    return mapCourseMemberError(error);
  }
});
