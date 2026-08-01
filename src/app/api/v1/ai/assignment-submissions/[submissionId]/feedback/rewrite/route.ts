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
      },
      apiKey
    );

    return NextResponse.json({ suggestion });
  } catch (error) {
    console.error('Feedback rewrite failed:', error);

    return NextResponse.json(
      { message: 'Unable to enhance feedback.' },
      { status: 502 }
    );
  }
});
