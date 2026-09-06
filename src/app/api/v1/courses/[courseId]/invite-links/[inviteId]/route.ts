import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/api/middlewares';
import { CourseInvitationService } from '@/services/CourseInvitationService';
import { mapCourseMemberError } from '../../members/course-member-route-utils';

const paramsSchema = z.object({
  courseId: z.string().uuid(),
  inviteId: z.string().uuid(),
});

export const DELETE = withAuth(async (_req, sessionData, { params }) => {
  try {
    const parsedParams = paramsSchema.safeParse(await params);

    if (!parsedParams.success) {
      return NextResponse.json(
        { message: 'Invalid request', details: parsedParams.error.flatten() },
        { status: 400 }
      );
    }

    const result = await CourseInvitationService.revokeInviteLink({
      courseId: parsedParams.data.courseId,
      inviteId: parsedParams.data.inviteId,
      currentUserId: sessionData.user.id,
    });

    return NextResponse.json(result);
  } catch (error) {
    return mapCourseMemberError(error);
  }
});
