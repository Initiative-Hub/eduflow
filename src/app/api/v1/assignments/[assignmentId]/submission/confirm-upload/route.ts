import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/api/middlewares';
import { AssignmentService } from '@/services/AssignmentService';

export const POST = withAuth(async (request, session, { params }) => {
  try {
    const parsedParams = z
      .object({ assignmentId: z.uuid() })
      .safeParse(await params);

    const body = z.object({ fileId: z.uuid() }).safeParse(await request.json());

    if (!parsedParams.success || !body.success) {
      return NextResponse.json(
        { message: 'Invalid confirmation data' },
        { status: 400 }
      );
    }
    const result = await AssignmentService.confirmSubmissionUpload({
      assignmentId: parsedParams.data.assignmentId,
      userId: session.user.id,
      fileId: body.data.fileId,
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    return NextResponse.json({ message }, { status: 500 });
  }
});
