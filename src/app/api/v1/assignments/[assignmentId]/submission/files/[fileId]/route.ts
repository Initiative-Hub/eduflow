import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/api/middlewares';
import { isStorageError } from '@/lib/storage/inventory-errors';
import { AssignmentService } from '@/services/AssignmentService';

const paramsSchema = z.object({
  assignmentId: z.uuid(),
  fileId: z.uuid(),
});

/**
 * @swagger
 * /api/v1/assignments/{assignmentId}/submission/files/{fileId}:
 *   delete:
 *     tags:
 *       - Assignment submissions
 *     summary: Remove a file from a draft submission
 *     description: Permanently deletes a file belonging to the authenticated student's draft submission. Files from submitted or graded submissions cannot be removed.
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
 *       - in: path
 *         name: fileId
 *         required: true
 *         description: Inventory file identifier.
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Draft file removed successfully.
 *       400:
 *         description: The assignment or file identifier is invalid.
 *       401:
 *         description: Authentication is required.
 *       403:
 *         description: The user is not an active student in the course.
 *       404:
 *         description: The assignment or submission file was not found.
 *       409:
 *         description: The file belongs to a submitted or graded submission, or is still referenced elsewhere.
 *       500:
 *         description: The file could not be removed.
 */
export const DELETE = withAuth(async (_request, session, { params }) => {
  const parsedParams = paramsSchema.safeParse(await params);

  if (!parsedParams.success) {
    return NextResponse.json(
      { message: 'Invalid assignment or file ID' },
      { status: 400 }
    );
  }

  try {
    await AssignmentService.removeDraftSubmissionFile({
      assignmentId: parsedParams.data.assignmentId,
      fileId: parsedParams.data.fileId,
      userId: session.user.id,
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (isStorageError(error)) {
      return NextResponse.json(
        {
          message: error.message,
          code: error.code,
          details: error.details,
        },
        { status: error.status }
      );
    }

    const message = error instanceof Error ? error.message : 'Internal error';

    if (message === 'Only students can submit this assignment') {
      return NextResponse.json({ message }, { status: 403 });
    }

    if (
      message === 'Assignment not found' ||
      message === 'Submission file not found'
    ) {
      return NextResponse.json({ message }, { status: 404 });
    }

    if (message === 'Only draft submission files can be removed') {
      return NextResponse.json({ message }, { status: 409 });
    }

    return NextResponse.json({ message }, { status: 500 });
  }
});
