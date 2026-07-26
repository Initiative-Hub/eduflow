import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/api/middlewares';
import { AssignmentService } from '@/services/AssignmentService';

/**
 * @swagger
 * /api/v1/assignments/{assignmentId}/submission/confirm-upload:
 *   post:
 *     tags:
 *       - Assignment submissions
 *     summary: Confirm a submission file upload
 *     description: Verifies that the directly uploaded object exists, marks its inventory record as ready, and returns the confirmed file metadata.
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
 *             required:
 *               - fileId
 *             properties:
 *               fileId:
 *                 type: string
 *                 format: uuid
 *                 description: Inventory file identifier returned by the initialization endpoint.
 *     responses:
 *       200:
 *         description: Upload confirmed successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     name:
 *                       type: string
 *                     fileSize:
 *                       type: integer
 *                       nullable: true
 *                     mimeType:
 *                       type: string
 *                       nullable: true
 *                     status:
 *                       type: string
 *       400:
 *         description: The assignment identifier or file identifier is invalid.
 *       401:
 *         description: Authentication is required.
 *       500:
 *         description: The upload could not be confirmed.
 */
export const POST = withAuth(async (request, session, { params }) => {
  try {
    const parsedParams = z
      .object({ assignmentId: z.uuid() })
      .safeParse(await params);

    const body = z.object({ fileId: z.uuid() }).safeParse(await request.json());

    if (!parsedParams.success || !body.success) {
      return NextResponse.json(
        { message: 'Invalid confirmation data' },
        { status: 400 }
      );
    }
    const result = await AssignmentService.confirmSubmissionUpload({
      assignmentId: parsedParams.data.assignmentId,
      userId: session.user.id,
      fileId: body.data.fileId,
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    return NextResponse.json({ message }, { status: 500 });
  }
});
