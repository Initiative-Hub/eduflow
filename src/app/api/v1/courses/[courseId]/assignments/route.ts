import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/api/middlewares';
import { AssignmentCommandService } from '@/services/assignments/AssignmentCommandService';
import { AssignmentQueryService } from '@/services/assignments/AssignmentQueryService';
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

/**
 * @swagger
 * /api/v1/courses/{courseId}/assignments:
 *   get:
 *     tags:
 *       - Assignments
 *     summary: List course assignments
 *     description: Returns the active assignments in a course together with the current user's assignment permissions and, for students, their active draft and latest finalized submission as separate fields.
 *     security:
 *       - SessionCookie: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         description: Course identifier.
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Course assignments returned successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       400:
 *         description: The course identifier is invalid.
 *       401:
 *         description: Authentication is required.
 *       403:
 *         description: The user cannot view assessments in this course.
 *       500:
 *         description: Failed to list assignments.
 */
export const GET = withAuth(async (_request, session, { params }) => {
  try {
    const parsedParams = paramsSchema.safeParse(await params);

    if (!parsedParams.success) {
      return NextResponse.json(
        { message: 'Invalid course ID' },
        { status: 400 }
      );
    }

    const assignments = await AssignmentQueryService.list(
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

/**
 * @swagger
 * /api/v1/courses/{courseId}/assignments:
 *   post:
 *     tags:
 *       - Assignments
 *     summary: Create a course assignment
 *     description: Creates an assignment containing a Tiptap JSON document, an optional deadline, and a maximum score.
 *     security:
 *       - SessionCookie: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         description: Course identifier.
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - content
 *               - dueAt
 *               - maxPoints
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
 *       201:
 *         description: Assignment created successfully.
 *       400:
 *         description: The course identifier or assignment payload is invalid.
 *       401:
 *         description: Authentication is required.
 *       403:
 *         description: The user cannot create assessments in this course.
 *       500:
 *         description: Failed to create the assignment.
 */
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

    const assignment = await AssignmentCommandService.create({
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
