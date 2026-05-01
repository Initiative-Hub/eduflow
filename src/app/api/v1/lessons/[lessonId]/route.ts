import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/api/middlewares';
import { LessonService } from '@/services/LessonService';

const patchLessonSchema = z.object({
  title: z.string().optional(),
  content: z
    .object({
      type: z.literal('doc'),
      content: z.array(z.unknown()).optional(),
    })
    .passthrough()
    .optional(),
});

/**
 * @swagger
 * /api/v1/lessons/{lessonId}:
 *   patch:
 *     tags:
 *       - Lessons
 *     summary: Update a lesson
 *     security:
 *       - SessionCookie: []
 *     parameters:
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: object
 *     responses:
 *       200:
 *         description: Lesson updated
 *       400:
 *         description: Invalid data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal server error
 *
 */
export const PATCH = withAuth(async (req, sessionData, { params }) => {
  try {
    const userId = sessionData.user.id;
    const { lessonId } = await params;

    const body = await req.json();
    const parsed = patchLessonSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: 'Invalid data' }, { status: 400 });
    }

    const updatedLesson = await LessonService.updateLesson(lessonId, userId, {
      title: parsed.data.title,
      content: parsed.data.content,
    });

    return NextResponse.json(updatedLesson);
  } catch (error: any) {
    console.error('Update lesson error:', error);
    if (error.message?.includes('Unauthorized')) {
      return NextResponse.json({ message: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { message: 'An internal error occurred while saving the lesson.' },
      { status: 500 }
    );
  }
});

/**
 * @swagger
 * /api/v1/lessons/{lessonId}:
 *   get:
 *     tags:
 *       - Lessons
 *     summary: Get a lesson by id
 *     security:
 *       - SessionCookie: []
 *     parameters:
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lesson details
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Lesson not found
 *       500:
 *         description: Internal server error
 */
export const GET = withAuth(async (_req, sessionData, { params }) => {
  try {
    const userId = sessionData.user.id;
    const { lessonId } = await params;

    const lesson = await LessonService.getLessonById(lessonId, userId);
    return NextResponse.json(lesson);
  } catch (error: any) {
    console.error('Get lesson error:', error);
    if (error.message?.includes('Unauthorized')) {
      return NextResponse.json({ message: error.message }, { status: 403 });
    }
    if (error.message?.includes('not found')) {
      return NextResponse.json(
        { message: 'Lesson not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { message: 'An internal error occurred while fetching the lesson.' },
      { status: 500 }
    );
  }
});
