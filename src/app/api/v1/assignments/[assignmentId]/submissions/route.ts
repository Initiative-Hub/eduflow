import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/api/middlewares';
import { AssignmentService } from '@/services/AssignmentService';

/**
 * @swagger
 * /api/v1/assignments/{assignmentId}/submissions:
 *   get:
 *     tags:
 *       - Assignment submissions
 *     summary: List the assignment submission roster
 *     description: Returns every active student in the course with their latest finalized submission, or a null submission when they have not submitted. Draft attempts remain private. Requires assessment-grading permission.
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
 *         description: Assignment submission roster returned successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       400:
 *         description: The assignment identifier is invalid.
 *       401:
 *         description: Authentication is required.
 *       403:
 *         description: The user cannot grade submissions for this assignment.
 *       500:
 *         description: Failed to list assignment submissions.
 */
export const GET = withAuth(async (_request, session, { params }) => {
  const parsed = z.object({ assignmentId: z.uuid() }).safeParse(await params);

  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Invalid assignment ID' },
      { status: 400 }
    );
  }

  try {
    const roster = await AssignmentService.listSubmissionRoster(
      parsed.data.assignmentId,
      session.user.id
    );

    return NextResponse.json(roster);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';

    if (message === 'Forbidden') {
      return NextResponse.json({ message }, { status: 403 });
    }

    return NextResponse.json({ message }, { status: 500 });
  }
});
