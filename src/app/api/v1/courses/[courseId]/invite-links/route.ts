import { NextResponse } from 'next/server';
import { z } from 'zod';
import { CourseRoleName } from '@/generated/prisma';
import { withAuth } from '@/lib/api/middlewares';
import { getCoursePermissions } from '@/lib/permissions/course-permission';
import { COURSE_PERMISSION } from '@/lib/permissions/permission-keys';
import { CourseInvitationService } from '@/services/CourseInvitationService';
import { mapCourseMemberError } from '../members/course-member-route-utils';

const courseParamsSchema = z.object({
  courseId: z.string().uuid(),
});

const createInviteLinkSchema = z.object({
  expiresAt: z.string().datetime().nullable().optional(),
  maxUses: z.number().int().min(1).max(10_000).nullable().optional(),
  role: z.enum([CourseRoleName.TEACHER, CourseRoleName.STUDENT]),
});

export const GET = withAuth(async (_req, sessionData, { params }) => {
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

    return NextResponse.json(
      await CourseInvitationService.listInviteLinks(parsedParams.data.courseId)
    );
  } catch (error) {
    return mapCourseMemberError(error);
  }
});

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

    const parsedBody = createInviteLinkSchema.safeParse(await req.json());

    if (!parsedBody.success) {
      return NextResponse.json(
        { message: 'Invalid request', details: parsedBody.error.flatten() },
        { status: 400 }
      );
    }

    const result = await CourseInvitationService.createInviteLink({
      courseId: parsedParams.data.courseId,
      createdById: sessionData.user.id,
      expiresAt: parsedBody.data.expiresAt
        ? new Date(parsedBody.data.expiresAt)
        : undefined,
      maxUses: parsedBody.data.maxUses,
      role: parsedBody.data.role,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return mapCourseMemberError(error);
  }
});
