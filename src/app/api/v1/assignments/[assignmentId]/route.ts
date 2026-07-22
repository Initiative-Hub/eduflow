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

/**
 * @swagger
 * /api/v1/assignments/{assignmentId}:
 *   get:
 *     tags:
 *       - Assignments
 *     summary: Get an assignment
 *     description: Returns one assignment with the current user's permissions and the authenticated student's submission, when applicable.
 *     security:
 *       - SessionCookie: []
 *     parameters:
 *       - in: path
 *         name: assignmentId
 *         required: true
 *         description: Assignment identifier.
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Assignment returned successfully.
 *       400:
 *         description: The assignment identifier is invalid.
 *       401:
 *         description: Authentication is required.
 *       403:
 *         description: The user cannot view this assignment.
 *       404:
 *         description: Assignment not found.
 *       500:
 *         description: Failed to retrieve the assignment.
 */
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

/**
 * @swagger
 * /api/v1/assignments/{assignmentId}:
 *   patch:
 *     tags:
 *       - Assignments
 *     summary: Update an assignment
 *     description: Updates one or more editable assignment fields and returns the enriched assignment view.
 *     security:
 *       - SessionCookie: []
 *     parameters:
 *       - in: path
 *         name: assignmentId
 *         required: true
 *         description: Assignment identifier.
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 200
 *               content:
 *                 type: object
 *                 description: Tiptap JSON document with a root type of doc.
 *               dueAt:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *               maxPoints:
 *                 type: number
 *                 exclusiveMinimum: true
 *                 minimum: 0
 *                 maximum: 100000
 *     responses:
 *       200:
 *         description: Assignment updated successfully.
 *       400:
 *         description: The assignment identifier or payload is invalid.
 *       401:
 *         description: Authentication is required.
 *       403:
 *         description: The user cannot update this assignment.
 *       404:
 *         description: Assignment not found.
 *       500:
 *         description: Failed to update the assignment.
 */
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

/**
 * @swagger
 * /api/v1/assignments/{assignmentId}:
 *   delete:
 *     tags:
 *       - Assignments
 *     summary: Delete an assignment
 *     description: Soft-deletes an assignment so it is no longer available in the course.
 *     security:
 *       - SessionCookie: []
 *     parameters:
 *       - in: path
 *         name: assignmentId
 *         required: true
 *         description: Assignment identifier.
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Assignment deleted successfully.
 *       400:
 *         description: The assignment identifier is invalid.
 *       401:
 *         description: Authentication is required.
 *       403:
 *         description: The user cannot delete this assignment.
 *       404:
 *         description: Assignment not found.
 *       500:
 *         description: Failed to delete the assignment.
 */
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
