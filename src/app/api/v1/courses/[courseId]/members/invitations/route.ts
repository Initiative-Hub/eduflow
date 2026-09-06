import { NextResponse } from 'next/server';
import { z } from 'zod';
import { CourseRoleName } from '@/generated/prisma';
import { withAuth } from '@/lib/api/middlewares';
import { CourseInvitationService } from '@/services/CourseInvitationService';
import { mapCourseMemberError } from '../course-member-route-utils';

const courseParamsSchema = z.object({
  courseId: z.string().uuid(),
});

const inviteMemberSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum([CourseRoleName.TEACHER, CourseRoleName.STUDENT]),
});

/**
 * @swagger
 * /api/v1/courses/{courseId}/members/invitations:
 *   post:
 *     tags:
 *       - Courses
 *     summary: Invite a registered user to a course
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

    const parsedBody = inviteMemberSchema.safeParse(await req.json());

    if (!parsedBody.success) {
      return NextResponse.json(
        { message: 'Invalid request', details: parsedBody.error.flatten() },
        { status: 400 }
      );
    }

    const result = await CourseInvitationService.inviteRegisteredUser({
      courseId: parsedParams.data.courseId,
      invitedById: sessionData.user.id,
      role: parsedBody.data.role,
      userId: parsedBody.data.userId,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return mapCourseMemberError(error);
  }
});
