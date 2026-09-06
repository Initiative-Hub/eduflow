import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/api/middlewares';
import { CourseInvitationService } from '@/services/CourseInvitationService';
import { mapCourseMemberError } from '../../../courses/[courseId]/members/course-member-route-utils';

const paramsSchema = z.object({
  inviteId: z.string().uuid(),
});

export const POST = withAuth(async (_req, sessionData, { params }) => {
  try {
    const parsedParams = paramsSchema.safeParse(await params);

    if (!parsedParams.success) {
      return NextResponse.json(
        { message: 'Invalid request', details: parsedParams.error.flatten() },
        { status: 400 }
      );
    }

    const result = await CourseInvitationService.joinByPublicInviteLink({
      inviteId: parsedParams.data.inviteId,
      userId: sessionData.user.id,
    });

    return NextResponse.json(result);
  } catch (error) {
    return mapCourseMemberError(error);
  }
});
