import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/api/middlewares';
import { AssignmentService } from '@/services/AssignmentService';

const bodySchema = z.object({
  score: z.number().min(0),
  feedback: z.string().max(10000).optional(),
});

export const PATCH = withAuth(async (request, session, { params }) => {
  const parsedParams = z
    .object({ submissionId: z.uuid() })
    .safeParse(await params);

  const parsedBody = bodySchema.safeParse(await request.json());

  if (!parsedParams.success || !parsedBody.success) {
    return NextResponse.json(
      { message: 'Invalid grading data' },
      { status: 400 }
    );
  }

  try {
    const result = await AssignmentService.gradeSubmission({
      submissionId: parsedParams.data.submissionId,
      userId: session.user.id,
      ...parsedBody.data,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';

    if (message === 'Forbidden') {
      return NextResponse.json({ message }, { status: 403 });
    }

    return NextResponse.json({ message }, { status: 400 });
  }
});
