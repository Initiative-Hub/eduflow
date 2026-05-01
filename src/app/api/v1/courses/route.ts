import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth, withRoles } from '@/lib/api/middlewares';
import { CourseService } from '@/services/CourseService';

/**
 * @swagger
 * /api/v1/courses:
 *   get:
 *     tags:
 *       - Courses
 *     summary: List courses for the current teacher
 *     security:
 *       - SessionCookie: []
 *     responses:
 *       200:
 *         description: List of courses
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export const GET = withAuth(async (_req, sessionData) => {
  try {
    const userId = sessionData.user.id;
    const courses = await CourseService.getCoursesByOwner(userId);

    return NextResponse.json(courses);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
});

const createCourseSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
});

/**
 * @swagger
 * /api/v1/courses:
 *   post:
 *     tags:
 *       - Courses
 *     summary: Create a course
 *     security:
 *       - SessionCookie: []
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
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Course created
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
export const POST = withAuth(
  withRoles(['TEACHER', 'ADMIN'], async (req, sessionData) => {
    try {
      const userId = sessionData.user.id;

      const body = await req.json();
      const parsed = createCourseSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { message: 'Invalid data', errors: parsed.error.format() },
          { status: 400 }
        );
      }

      const course = await CourseService.createCourse({
        ownerId: userId,
        title: parsed.data.title,
        description: parsed.data.description,
      });

      return NextResponse.json(course, { status: 201 });
    } catch (error: any) {
      console.error('Create course error:', error);
      return NextResponse.json(
        { message: 'Internal Server Error' },
        { status: 500 }
      );
    }
  })
);
