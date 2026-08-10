import { NextResponse } from 'next/server';
import * as z from 'zod';
import { withAuth } from '@/lib/api/middlewares';
import { AssignmentResultService } from '@/services/AssignmentResultService';

const paramsSchema = z.object({
  assignmentId: z.uuid(),
});

/**
 * @swagger
 * /api/v1/assignments/{assignmentId}/results/publish:
 *   post:
 *     summary: Publish or update assignment results
 *     description: Publishes graded results for active students in one assignment.
 *     tags:
 *       - Assignments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assignmentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Results published successfully
 *       400:
 *         description: Invalid assignment ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Missing grading permission
 *       404:
 *         description: Assignment not found
 *       500:
 *         description: Failed to publish results
 */
export const POST = withAuth(async (_request, session { params }) => {
  const parsedParams = paramsSchema.safeParse(await params);

  if (!parsedParams.success) {
    return NextResponse.json(
      {
        error: 'Invalid assignment ID',
      },
      {
        status: 400,
      }
    );
  }

  try {
    const result = await AssignmentResultService.publish({
      assignmentId: parsedParams.data.assignmentId,
      userId: session.user.id,
    });

    return NextResponse.json({
      data: result,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Assignment not found') {
      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 404,
        }
      );
    }

    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 403,
        }
      );
    }

    console.error('Failed to publish assignment results', error);

    return NextResponse.json(
      {
        error: 'Failed to publish assignment results',
      },
      {
        status: 500,
      }
    );
  }
});
