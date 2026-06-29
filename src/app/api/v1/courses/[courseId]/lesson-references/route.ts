import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/api/middlewares';
import { LessonReferenceService } from '@/services/LessonReferenceService';

const paramsSchema = z.object({
  courseId: z.string().uuid(),
});

/**
 * @swagger
 * /api/v1/courses/{courseId}/lesson-references:
 *   get:
 *     tags:
 *       - Lessons
 *     summary: List lesson references for a course
 *     security:
 *       - SessionCookie: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Module and lesson summaries
 *       400:
 *         description: Invalid course ID
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal server error
 */
export const GET = withAuth(async (_req, sessionData, { params }) => {
  try {
    const parsedParams = paramsSchema.safeParse(await params);

    if (!parsedParams.success) {
      return NextResponse.json(
        { message: 'Invalid course ID' },
        { status: 400 }
      );
    }

    const modules = await LessonReferenceService.listCourseLessonReferences({
      courseId: parsedParams.data.courseId,
      userId: sessionData.user.id,
    });

    return NextResponse.json(modules);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Internal Server Error';

    if (message.includes('Unauthorized')) {
      return NextResponse.json({ message }, { status: 403 });
    }

    return NextResponse.json(
      { message: 'Unable to load lesson references.' },
      { status: 500 }
    );
  }
});
