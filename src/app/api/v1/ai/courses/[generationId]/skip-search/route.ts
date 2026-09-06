import { NextResponse } from 'next/server';
import * as z from 'zod';
import { withAuth } from '@/lib/api/middlewares';
import {
  getCourseContentGenerationControl,
  requestCourseContentSearchSkip,
} from '@/lib/course-content/generation-control';
import { getCoursePermissions } from '@/lib/permissions/course-permission';
import { COURSE_PERMISSION } from '@/lib/permissions/permission-keys';

const generationIdSchema = z.string().uuid();

/**
 * @swagger
 * /api/v1/ai/courses/{generationId}/skip-search:
 *   post:
 *     tags:
 *       - AI Courses
 *     summary: Skip supplementary web search for an active course content generation
 *     security:
 *       - SessionCookie: []
 *     parameters:
 *       - in: path
 *         name: generationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       202:
 *         description: Web search skip requested
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Generation control not found
 */
export const POST = withAuth(async (_request, sessionData, { params }) => {
  const { generationId } = await params;
  const parsedGenerationId = generationIdSchema.safeParse(generationId);
  if (!parsedGenerationId.success) {
    return NextResponse.json(
      { error: 'Invalid generation ID' },
      { status: 400 }
    );
  }

  const control = await getCourseContentGenerationControl(
    parsedGenerationId.data
  );
  if (!control) {
    return NextResponse.json(
      { error: 'Generation control not found' },
      { status: 404 }
    );
  }

  if (control.userId !== sessionData.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const permissions = await getCoursePermissions(
    sessionData.user.id,
    control.courseId
  );
  if (
    permissions.withoutPermission(COURSE_PERMISSION.COURSE_CONTENT_CREATE) ||
    permissions.withoutPermission(COURSE_PERMISSION.AI_USE_COURSE_GENERATION)
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const updatedControl = await requestCourseContentSearchSkip(
    parsedGenerationId.data
  );
  if (!updatedControl) {
    return NextResponse.json(
      { error: 'Generation control not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({ skipped: true }, { status: 202 });
});
