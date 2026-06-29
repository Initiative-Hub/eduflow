import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth, withRoles } from '@/lib/api/middlewares';
import { CourseService } from '@/services/CourseService';

const patchCourseSchema = z.object({
  isPublished: z.boolean(),
});

/**
 * @swagger
 * /api/v1/courses/{courseId}:
 *   get:
 *     tags:
 *       - Courses
 *     summary: Get a course by id
 *     security:
 *       - SessionCookie: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Course details
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Course not found
 *       500:
 *         description: Internal server error
 */
export const GET = withAuth(async (_req, sessionData, { params }) => {
  try {
    const { courseId } = await params;
    const userId = sessionData.user.id;
    const course = await CourseService.getCourseById(courseId, userId);

    return NextResponse.json(course);
  } catch (error: any) {
    if (error.message === 'Course not found') {
      return NextResponse.json(
        { message: 'Course not found' },
        { status: 404 }
      );
    }
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
});
/**
 * @swagger
 * /api/v1/courses/{courseId}:
 *   patch:
 *     tags:
 *       - Courses
 *     summary: Update course publish status
 *     security:
 *       - SessionCookie: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [isPublished]
 *             properties:
 *               isPublished:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Course updated
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
export const PATCH = withRoles(
  ['TEACHER'],
  async (req, sessionData, { params }) => {
    try {
      const userId = sessionData.user.id;
      const { courseId } = await params;

      const body = await req.json();
      const parsed = patchCourseSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json({ message: 'Invalid data' }, { status: 400 });
      }

      const updatedCourse = await CourseService.togglePublish(
        courseId,
        parsed.data.isPublished,
        userId
      );

      return NextResponse.json(updatedCourse);
    } catch (error: any) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
      }
      console.error('Update course error:', error);
      return NextResponse.json(
        { message: 'Internal Server Error' },
        { status: 500 }
      );
    }
  }
);
