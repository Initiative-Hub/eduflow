import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/api/middlewares';
import { ModuleService } from '@/services/ModuleService';

/**
 * @swagger
 * /api/v1/courses/{courseId}/modules:
 *   get:
 *     tags:
 *       - Modules
 *     summary: List modules for a course
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
 *         description: List of modules
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export const GET = withAuth(async (_req, sessionData, { params }) => {
  try {
    if (!sessionData)
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const resolvedParams = await params;
    const modules = await ModuleService.getModulesByCourse(
      resolvedParams.courseId,
      sessionData.user.id
    );

    return NextResponse.json(modules);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
});

const createModuleSchema = z.object({
  title: z.string().min(1, 'Title is required'),
});

/**
 * @swagger
 * /api/v1/courses/{courseId}/modules:
 *   post:
 *     tags:
 *       - Modules
 *     summary: Create a module in a course
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
 *             required: [title]
 *             properties:
 *               title:
 *                 type: string
 *     responses:
 *       201:
 *         description: Module created
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
    const parsed = createModuleSchema.safeParse(body);

    if (!parsed.success)
      return NextResponse.json({ message: 'Invalid data' }, { status: 400 });

    const newModule = await ModuleService.createModule({
      courseId: resolvedParams.courseId,
      title: parsed.data.title,
      userId: sessionData.user.id,
    });

    return NextResponse.json(newModule, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
});
