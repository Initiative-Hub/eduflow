import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/api/middlewares';
import { CourseInvitationService } from '@/services/CourseInvitationService';
import { mapCourseMemberError } from '../../../courses/[courseId]/members/course-member-route-utils';

const paramsSchema = z.object({
  invitationId: z.string().uuid(),
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

    const result = await CourseInvitationService.declineDirectInvitation({
      invitationId: parsedParams.data.invitationId,
      userId: sessionData.user.id,
    });

    return NextResponse.json(result);
  } catch (error) {
    return mapCourseMemberError(error);
  }
});
