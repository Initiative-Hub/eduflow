import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { Prisma } from '@/generated/prisma';
import { errorResponse } from '@/lib/api/error-response';
import { withAuth } from '@/lib/api/middlewares';
import { getCoursePermissions } from '@/lib/permissions/course-permission';
import { COURSE_PERMISSION } from '@/lib/permissions/permission-keys';
import { prisma } from '@/lib/prisma';

// ─── Validation Schemas ──────────────────────────────────────────────────────

const createQuestionSchema = z.object({
  lessonId: z.string().nullable().optional(),
  category: z.enum(['SELECTION_BASED', 'OPEN_ENDED']),
  subType: z.enum([
    'MULTIPLE_CHOICE',
    'TRUE_FALSE',
    'MATCHING',
    'ORDERING',
    'ESSAY',
    'FILL_IN_THE_BLANK',
    'DRAG_AND_DROP',
  ]),
  prompt: z.string().min(1, 'Prompt is required'),
  answerData: z.record(z.string(), z.unknown()),
  explanation: z.string().optional(),
});

// ─── GET /api/v1/courses/:courseId/questions ──────────────────────────────────

/**
 * @swagger
 * /api/v1/courses/{courseId}/questions:
 *   get:
 *     tags:
 *       - Questions
 *     summary: List questions for a course with optional filters
 *     security:
 *       - SessionCookie: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: subType
 *         schema:
 *           type: string
 *       - in: query
 *         name: lessonId
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of questions
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export const GET = withAuth(async (req, sessionData, { params }) => {
  try {
    const { courseId } = await params;
    const permissions = await getCoursePermissions(
      sessionData.user.id,
      courseId
    );
    if (
      permissions.withoutPermission(COURSE_PERMISSION.ASSESSMENTS_CREATE) ||
      permissions.withoutPermission(COURSE_PERMISSION.ASSESSMENTS_UPDATE) ||
      permissions.withoutPermission(COURSE_PERMISSION.ASSESSMENTS_DELETE)
    ) {
      return errorResponse('FORBIDDEN', 'Forbidden', 403);
    }
    const { searchParams } = new URL(req.url);

    const category = searchParams.get('category');
    const subType = searchParams.get('subType');
    const lessonId = searchParams.get('lessonId');
    const search = searchParams.get('search');

    // Build where clause with filters
    const where: Record<string, unknown> = { courseId };

    if (category) {
      where.category = category;
    }
    if (subType) {
      where.subType = subType;
    }
    if (lessonId) {
      where.lessonId = lessonId === 'null' ? null : lessonId;
    }
    if (search) {
      where.prompt = { contains: search, mode: 'insensitive' };
    }

    const questions = await prisma.question.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(questions);
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Forbidden') {
      return errorResponse('FORBIDDEN', 'Forbidden', 403);
    }
    console.error('Error fetching questions:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal Server Error', 500);
  }
});

// ─── POST /api/v1/courses/:courseId/questions ─────────────────────────────────

/**
 * @swagger
 * /api/v1/courses/{courseId}/questions:
 *   post:
 *     tags:
 *       - Questions
 *     summary: Create a question in a course
 *     security:
 *       - SessionCookie: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [category, subType, prompt, answerData]
 *             properties:
 *               lessonId:
 *                 type: string
 *                 nullable: true
 *               category:
 *                 type: string
 *               subType:
 *                 type: string
 *               prompt:
 *                 type: string
 *               answerData:
 *                 type: object
 *               explanation:
 *                 type: string
 *     responses:
 *       201:
 *         description: Question created
 *       400:
 *         description: Invalid data
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export const POST = withAuth(async (req, sessionData, { params }) => {
  try {
    const { courseId } = await params;
    const permissions = await getCoursePermissions(
      sessionData.user.id,
      courseId
    );
    if (permissions.withoutPermission(COURSE_PERMISSION.ASSESSMENTS_CREATE)) {
      return errorResponse('FORBIDDEN', 'Forbidden', 403);
    }
    const body = await req.json();

    const parsed = createQuestionSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        'VALIDATION_ERROR',
        'Invalid question data',
        400,
        parsed.error.format()
      );
    }

    const { lessonId, category, subType, prompt, answerData, explanation } =
      parsed.data;

    // Verify course exists
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true },
    });

    if (!course) {
      return errorResponse('COURSE_NOT_FOUND', 'Course not found', 404);
    }

    const question = await prisma.question.create({
      data: {
        courseId,
        lessonId: lessonId ?? null,
        category,
        subType,
        prompt,
        answerData: answerData as unknown as Prisma.InputJsonValue,
        explanation,
      },
    });

    return NextResponse.json(question, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Forbidden') {
      return errorResponse('FORBIDDEN', 'Forbidden', 403);
    }
    console.error('Error creating question:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal Server Error', 500);
  }
});
