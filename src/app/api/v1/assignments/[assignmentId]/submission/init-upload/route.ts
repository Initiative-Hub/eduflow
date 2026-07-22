import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/api/middlewares';
import { AssignmentService } from '@/services/AssignmentService';

const paramsSchema = z.object({
  assignmentId: z.uuid(),
});

const bodySchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  contentType: z.string().min(1),
  fileSize: z.number().int().positive(),
});

/**
 * @swagger
 * /api/v1/assignments/{assignmentId}/submission/init-upload:
 *   post:
 *     tags:
 *       - Assignment submissions
 *     summary: Initialize a submission file upload
 *     description: Creates or reuses the student's draft submission, creates a private inventory file, links it to the submission, and returns a presigned URL for direct upload.
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
 *               - fileName
 *               - contentType
 *               - fileSize
 *             properties:
 *               fileName:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 255
 *               contentType:
 *                 type: string
 *                 minLength: 1
 *               fileSize:
 *                 type: integer
 *                 minimum: 1
 *     responses:
 *       200:
 *         description: Upload initialized successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     assignmentId:
 *                       type: string
 *                       format: uuid
 *                     submissionId:
 *                       type: string
 *                       format: uuid
 *                     fileId:
 *                       type: string
 *                       format: uuid
 *                     uploadUrl:
 *                       type: string
 *                       format: uri
 *                     uploadHeaders:
 *                       type: object
 *                       additionalProperties:
 *                         type: string
 *                     name:
 *                       type: string
 *       400:
 *         description: The assignment identifier or upload metadata is invalid.
 *       401:
 *         description: Authentication is required.
 *       403:
 *         description: The user is not an enrolled student or the assignment was already submitted.
 *       500:
 *         description: Failed to initialize the upload.
 */
export const POST = withAuth(async (request, session, { params }) => {
  try {
    const parsedParams = paramsSchema.safeParse(await params);
    const parsedBody = bodySchema.safeParse(await request.json());

    if (!parsedParams.success || !parsedBody.success) {
      return NextResponse.json(
        { message: 'Invalid upload data' },
        { status: 400 }
      );
    }

    const result = await AssignmentService.initializeSubmissionUpload({
      assignmentId: parsedParams.data.assignmentId,
      userId: session.user.id,
      ...parsedBody.data,
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';

    if (
      message === 'Only students can submit this assignment' ||
      message === 'This assignment has already been submitted'
    ) {
      return NextResponse.json({ message }, { status: 403 });
    }

    return NextResponse.json({ message }, { status: 500 });
  }
});
