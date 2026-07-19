import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/api/middlewares';
import { AssignmentService } from '@/services/AssignmentService';

export const POST = withAuth(async (_request, session, { params }) => {
  try {
    const parsed = z.object({ assignmentId: z.uuid() }).safeParse(await params);

    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Invalid assignment ID' },
        { status: 400 }
      );
    }

    const result = await AssignmentService.submitAssignment(
      parsed.data.assignmentId,
      session.user.id
    );

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    return NextResponse.json({ message }, { status: 400 });
  }
});
