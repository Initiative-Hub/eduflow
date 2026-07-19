import { request } from 'http';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/api/middlewares';
import { AssignmentService } from '@/services/AssignmentService';
import { isTiptapDocument, type TiptapDocument } from '@/utils/lesson-content';

const paramsSchema = z.object({
  courseId: z.uuid(),
});

const createAssignmentSchema = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.custom<TiptapDocument>(isTiptapDocument),
  dueAt: z.coerce.date().nullable(),
  maxPoints: z.number().positive().max(100000),
});

export const GET = withAuth(async (_request, session, { params }) => {
  try {
    const parsedParams = paramsSchema.safeParse(await params);

    if (!parsedParams.success) {
      return NextResponse.json(
        { message: 'Invalid course ID' },
        { status: 400 }
      );
    }

    const assignments = await AssignmentService.listAssignments(
      parsedParams.data.courseId,
      session.user.id
    );

    return NextResponse.json(assignments);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';

    if (message === 'Forbidden') {
      return NextResponse.json({ message }, { status: 403 });
    }

    return NextResponse.json({ message }, { status: 500 });
  }
});

export const POST = withAuth(async (request, session, { params }) => {
  try {
    const parsedParams = paramsSchema.safeParse(await params);
    const body = await request.json();
    const parsedBody = createAssignmentSchema.safeParse(body);

    if (!parsedParams.success || !parsedBody.success) {
      return NextResponse.json(
        { message: 'Invalid assignment data' },
        { status: 400 }
      );
    }

    const assignment = await AssignmentService.createAssignment({
      courseId: parsedParams.data.courseId,
      userId: session.user.id,
      ...parsedBody.data,
    });

    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';

    if (message === 'Forbidden') {
      return NextResponse.json({ message }, { status: 403 });
    }

    return NextResponse.json({ message }, { status: 500 });
  }
});
