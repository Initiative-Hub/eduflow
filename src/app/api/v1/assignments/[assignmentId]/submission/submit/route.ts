import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/api/middlewares';
import { AssignmentSubmissionService } from '@/services/assignments/AssignmentSubmissionService';

/**
 * @swagger
 * /api/v1/assignments/{assignmentId}/submission/submit:
 *   post:
 *     tags:
 *       - Assignment submissions
 *     summary: Submit an assignment
 *     description: Finalizes the authenticated student's draft submission. At least one confirmed file is required and the assignment deadline must not have passed.
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
 *         description: Assignment submitted successfully.
 *       400:
 *         description: The identifier is invalid, the submission cannot be finalized, no confirmed file exists, or the deadline has passed.
 *       401:
 *         description: Authentication is required.
 */
export const POST = withAuth(async (_request, session, { params }) => {
  try {
    const parsed = z.object({ assignmentId: z.uuid() }).safeParse(await params);

    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Invalid assignment ID' },
        { status: 400 }
      );
    }

    const result = await AssignmentSubmissionService.submit(
      parsed.data.assignmentId,
      session.user.id
    );

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    return NextResponse.json({ message }, { status: 400 });
  }
});
