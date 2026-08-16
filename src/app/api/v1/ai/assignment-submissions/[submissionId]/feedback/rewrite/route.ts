import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AssignmentSubmissionStatus } from '@/generated/prisma';
import { withAuth } from '@/lib/api/middlewares';
import { getCoursePermissions } from '@/lib/permissions/course-permission';
import {
  COURSE_PERMISSION,
  PLATFORM_PERMISSION,
} from '@/lib/permissions/permission-keys';
import { getPlatformPermissions } from '@/lib/permissions/platform-permission';
import { prisma } from '@/lib/prisma';
import { AssignmentFeedbackAIService } from '@/services/ai/AssignmentFeedbackAIService';
import { UserAiPreferencesService } from '@/services/UserAiPreferencesService';

export const maxDuration = 60;

const paramsSchema = z.object({
  submissionId: z.uuid(),
});

const bodySchema = z
  .object({
    feedback: z.string().trim().min(1).max(10_000),
    tone: z
      .enum(['constructive', 'concise', 'encouraging'])
      .default('constructive'),
  })
  .strict();

/**
 * @swagger
 * /api/v1/ai/assignment-submissions/{submissionId}/feedback/rewrite:
 *   post:
 *     tags:
 *       - Assignment submissions
 *     summary: Rewrite assignment feedback with AI
 *     description: >
 *       Improves a teacher's draft feedback without saving it.
 *       The caller must have both assignment grading permission for the course
 *       and platform AI writing permission. Only submitted or graded
 *       submissions can use this endpoint.
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
 *               - feedback
 *             properties:
 *               feedback:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 10000
 *                 description: The teacher's draft feedback to improve.
 *               tone:
 *                 type: string
 *                 enum:
 *                   - constructive
 *                   - concise
 *                   - encouraging
 *                 default: constructive
 *                 description: The tone to use for the rewritten feedback.
 *     responses:
 *       200:
 *         description: Feedback rewritten successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - suggestion
 *               properties:
 *                 suggestion:
 *                   type: string
 *                   description: The AI-generated feedback suggestion.
 *       400:
 *         description: The submission ID or request body is invalid.
 *       401:
 *         description: Authentication is required.
 *       403:
 *         description: The user lacks grading or AI writing permission.
 *       404:
 *         description: A submitted or graded submission could not be found.
 *       502:
 *         description: The AI provider failed to generate feedback.
 *       503:
 *         description: AI feedback enhancement is not configured.
 */
export const POST = withAuth(async (request, session, { params }) => {
  const parsedParams = paramsSchema.safeParse(await params);
  const body = await request.json().catch(() => null);
  const parsedBody = bodySchema.safeParse(body);

  if (!parsedParams.success || !parsedBody.success) {
    return NextResponse.json(
      { message: 'Invalid feedback rewrite request.' },
      { status: 400 }
    );
  }

  const submission = await prisma.assignmentSubmission.findFirst({
    where: {
      id: parsedParams.data.submissionId,
      status: {
        in: [
          AssignmentSubmissionStatus.SUBMITTED,
          AssignmentSubmissionStatus.GRADED,
        ],
      },
      assignment: { deletedAt: null },
    },
    select: {
      assignment: {
        select: {
          title: true,
          courseId: true,
        },
      },
    },
  });

  if (!submission) {
    return NextResponse.json(
      {
        message: 'Submission not found.',
      },
      { status: 404 }
    );
  }

  const [coursePermissions, platformPermissions] = await Promise.all([
    getCoursePermissions(session.user.id, submission.assignment.courseId),
    getPlatformPermissions(session.user.id),
  ]);
  const cannotGrade = coursePermissions.withoutPermission(
    COURSE_PERMISSION.ASSESSMENTS_GRADE
  );

  const cannotUseWritingAI = platformPermissions.withoutPermission(
    PLATFORM_PERMISSION.AI_USE_WRITING
  );

  if (cannotGrade || cannotUseWritingAI) {
    return NextResponse.json({ message: 'Forbidden.' }, { status: 403 });
  }

  const customInstructions =
    await UserAiPreferencesService.getCustomInstructions(session.user.id);

  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { message: 'AI feedback enhancement is not configured.' },
      { status: 503 }
    );
  }

  try {
    const suggestion = await AssignmentFeedbackAIService.rewrite(
      {
        assignmentTitle: submission.assignment.title,
        draftFeedback: parsedBody.data.feedback,
        tone: parsedBody.data.tone,
        customInstructions,
      },
      apiKey
    );

    return NextResponse.json({ suggestion });
  } catch (error) {
    console.error('Feedback rewrite failed', {
      name: error instanceof Error ? error.name : 'UnknownError',
    });

    return NextResponse.json(
      { message: 'Unable to enhance feedback.' },
      { status: 502 }
    );
  }
});
