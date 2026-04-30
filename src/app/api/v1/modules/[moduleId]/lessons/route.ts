import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/api/middlewares';
import { LessonService } from '@/services/LessonService';

const createLessonSchema = z.object({
  title: z.string().min(1, 'Title is required'),
});

/**
 * @swagger
 * /api/v1/modules/{moduleId}/lessons:
 *   post:
 *     tags:
 *       - Lessons
 *     summary: Create a lesson in a module
 *     security:
 *       - SessionCookie: []
 *     parameters:
 *       - in: path
 *         name: moduleId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title:
 *                 type: string
 *     responses:
 *       201:
 *         description: Lesson created
 *       400:
 *         description: Invalid data
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 *
 */
export const POST = withAuth(async (req, sessionData, { params }) => {
  try {
    if (!sessionData)
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const resolvedParams = await params;
    const body = await req.json();
    const parsed = createLessonSchema.safeParse(body);

    if (!parsed.success)
      return NextResponse.json({ message: 'Invalid data' }, { status: 400 });

    const newLesson = await LessonService.createLesson({
      moduleId: resolvedParams.moduleId,
      title: parsed.data.title,
    });

    return NextResponse.json(newLesson, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
});
