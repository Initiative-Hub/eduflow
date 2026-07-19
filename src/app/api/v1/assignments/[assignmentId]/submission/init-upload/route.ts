import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/api/middlewares';
import { AssignmentService } from '@/services/AssignmentService';

const paramsSchema = z.object({
  assignmentId: z.uuid(),
});

const bodySchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  contentType: z.string().min(1),
  fileSize: z.number().int().positive(),
});

export const POST = withAuth(async (request, session, { params }) => {
  try {
    const parsedParams = paramsSchema.safeParse(await params);
    const parsedBody = bodySchema.safeParse(await request.json());

    if (!parsedParams.success || !parsedBody.success) {
      return NextResponse.json(
        { message: 'Invalid upload data' },
        { status: 400 }
      );
    }

    const result = await AssignmentService.initializeSubmissionUpload({
      assignmentId: parsedParams.data.assignmentId,
      userId: session.user.id,
      ...parsedBody.data,
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';

    if (
      message === 'Only students can submit this assignment' ||
      message === 'This assignment has already been submitted'
    ) {
      return NextResponse.json({ message }, { status: 403 });
    }

    return NextResponse.json({ message }, { status: 500 });
  }
});
