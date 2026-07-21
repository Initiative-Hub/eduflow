import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/api/middlewares';
import { AssignmentService } from '@/services/AssignmentService';
import { isTiptapDocument, type TiptapDocument } from '@/utils/lesson-content';

const paramsSchema = z.object({
  assignmentId: z.uuid(),
});

const updateSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  content: z.custom<TiptapDocument>(isTiptapDocument).optional(),
  dueAt: z.coerce.date().nullable().optional(),
  maxPoints: z.number().positive().max(100000).optional(),
});

export const GET = withAuth(async (_request, session, { params }) => {
  try {
    const parsed = paramsSchema.safeParse(await params);

    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Invalid assignment ID' },
        { status: 400 }
      );
    }

    const assignment = await AssignmentService.getAssignmentById(
      parsed.data.assignmentId,
      session.user.id
    );

    return NextResponse.json(assignment);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';

    if (message === 'Assignment not found') {
      return NextResponse.json({ message }, { status: 404 });
    }

    if (message === 'Forbidden') {
      return NextResponse.json({ message }, { status: 403 });
    }

    return NextResponse.json({ message }, { status: 500 });
  }
});

export const PATCH = withAuth(async (request, session, { params }) => {
  try {
    const parsedParams = paramsSchema.safeParse(await params);
    const body = await request.json();
    const parsedBody = updateSchema.safeParse(body);

    if (!parsedParams.success || !parsedBody.success) {
      return NextResponse.json(
        { message: 'Invalid assignment data' },
        { status: 400 }
      );
    }

    await AssignmentService.updateAssignment(
      parsedParams.data.assignmentId,
      session.user.id,
      parsedBody.data
    );

    const updatedAssignment = await AssignmentService.getAssignmentById(
      parsedParams.data.assignmentId,
      session.user.id
    );

    return NextResponse.json(updatedAssignment);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';

    if (message === 'Assignment not found') {
      return NextResponse.json({ message }, { status: 404 });
    }

    if (message === 'Forbidden') {
      return NextResponse.json({ message }, { status: 403 });
    }

    return NextResponse.json({ message }, { status: 500 });
  }
});

export const DELETE = withAuth(async (_request, session, { params }) => {
  try {
    const parsed = paramsSchema.safeParse(await params);

    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Invalid assignment ID' },
        { status: 400 }
      );
    }

    await AssignmentService.deleteAssignment(
      parsed.data.assignmentId,
      session.user.id
    );

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';

    if (message === 'Assignment not found') {
      return NextResponse.json({ message }, { status: 404 });
    }

    if (message === 'Forbidden') {
      return NextResponse.json({ message }, { status: 403 });
    }

    return NextResponse.json({ message }, { status: 500 });
  }
});
