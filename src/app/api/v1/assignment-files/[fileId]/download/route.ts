import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/api/middlewares';
import { AssignmentService } from '@/services/AssignmentService';

/**
 * @swagger
 * /api/v1/assignment-files/{fileId}/download:
 *   get:
 *     tags:
 *       - Assignment submissions
 *     summary: Download an assignment submission file
 *     description: Redirects the submission owner to their ready file, or a user with assessment-grading permission to a ready finalized submission file.
 *     security:
 *       - SessionCookie: []
 *     parameters:
 *       - in: path
 *         name: fileId
 *         required: true
 *         description: Assignment file identifier.
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       307:
 *         description: Redirect to the signed object-storage download URL.
 *         headers:
 *           Location:
 *             description: Short-lived signed download URL.
 *             schema:
 *               type: string
 *               format: uri
 *       400:
 *         description: The file identifier is invalid.
 *       401:
 *         description: Authentication is required.
 *       403:
 *         description: The user cannot access this submission file.
 *       404:
 *         description: The file is missing, deleted, or not ready.
 */
export const GET = withAuth(async (_request, session, { params }) => {
  const parsed = z.object({ fileId: z.uuid() }).safeParse(await params);

  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid file ID' }, { status: 400 });
  }

  try {
    const url = await AssignmentService.createFileDownloadUrl(
      parsed.data.fileId,
      session.user.id
    );

    return NextResponse.redirect(url);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';

    if (message === 'Forbidden') {
      return NextResponse.json({ message }, { status: 403 });
    }

    return NextResponse.json({ message }, { status: 404 });
  }
});
