import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/api/middlewares';
import { AssignmentGradingService } from '@/services/assignments/AssignmentGradingService';

const bodySchema = z.object({
  score: z.number().min(0),
  feedback: z.string().max(10000).optional(),
});

/**
 * @swagger
 * /api/v1/assignment-submissions/{submissionId}/grade:
 *   patch:
 *     tags:
 *       - Assignment submissions
 *     summary: Grade an assignment submission
 *     description: Records a score and optional feedback, then marks the submission as graded. The score cannot exceed the assignment's maximum points.
 *     security:
 *       - SessionCookie: []
 *     parameters:
 *       - in: path
 *         name: submissionId
 *         required: true
 *         description: Assignment submission identifier.
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
 *               - score
 *             properties:
 *               score:
 *                 type: number
 *                 minimum: 0
 *               feedback:
 *                 type: string
 *                 maxLength: 10000
 *     responses:
 *       200:
 *         description: Grade saved successfully.
 *       400:
 *         description: The grading payload is invalid, the submission does not exist, or the score is outside the allowed range.
 *       401:
 *         description: Authentication is required.
 *       403:
 *         description: The user cannot grade this assignment.
 */
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
    const result = await AssignmentGradingService.grade({
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
