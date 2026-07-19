import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/api/middlewares';
import { AssignmentService } from '@/services/AssignmentService';

export const GET = withAuth(async (_request, session, { params }) => {
  const parsed = z.object({ assignmentId: z.uuid() }).safeParse(await params);

  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Invalid assignment ID' },
      { status: 400 }
    );
  }

  try {
    const submissions = await AssignmentService.listSubmissions(
      parsed.data.assignmentId,
      session.user.id
    );

    return NextResponse.json(submissions);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';

    if (message === 'Forbidden') {
      return NextResponse.json({ message }, { status: 403 });
    }

    return NextResponse.json({ message }, { status: 500 });
  }
});
