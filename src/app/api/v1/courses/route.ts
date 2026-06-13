import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth, withRoles } from '@/lib/api/middlewares';
import { CourseService } from '@/services/CourseService';

const createCourseSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().max(1000).optional(),
});

const booleanQuerySchema = z
  .enum(['true', 'false'])
  .optional()
  .transform((value) => value === 'true');

const courseListQuerySchema = z.object({
  ownedOnly: booleanQuerySchema.default(false),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(12),
  publicOnly: booleanQuerySchema.default(false),
  search: z.string().default(''),
  sort: z
    .enum(['updated-desc', 'created-desc', 'title-asc', 'members-desc'])
    .default('updated-desc'),
});

/**
 * @swagger
 * /api/v1/courses:
 *   get:
 *     tags:
 *       - Courses
 *     summary: List accessible courses for the current user
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
export const GET = withAuth(async (req, sessionData) => {
  try {
    const userId = sessionData.user.id;
    const { searchParams } = new URL(req.url);
    const query = courseListQuerySchema.safeParse(
      Object.fromEntries(searchParams)
    );

    if (!query.success) {
      return NextResponse.json(
        { message: 'Invalid query parameters', errors: query.error.format() },
        { status: 400 }
      );
    }

    const courses = await CourseService.listAccessibleCourses(
      userId,
      query.data
    );

    return NextResponse.json(courses);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
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
