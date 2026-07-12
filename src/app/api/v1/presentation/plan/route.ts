import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/api/middlewares';
import { PresentationService } from '@/services/PresentationService';
import { SlideService } from '@/services/SlideService';

const planPresentationSchema = z.object({
  lessonId: z.string().min(1, 'lessonId is required'),
  duration: z
    .union([z.string(), z.number()])
    .transform((val) => String(val))
    .refine(
      (val) => ['5', '10', '15', '30', '45', '60', '90', '120'].includes(val),
      {
        message: 'Duration must be 5, 10, 15, 30, 45, 60, 90, or 120 minutes',
      }
    ),
  context: z
    .string()
    .max(500, 'Context guidelines cannot exceed 500 characters')
    .optional()
    .default(''),
  collection: z.string().optional(),
});

/**
 * @swagger
 * /api/v1/presentation/plan:
 *   post:
 *     tags:
 *       - Presentation
 *     summary: Plan presentation slides structure for a lesson
 *     security:
 *       - SessionCookie: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - lessonId
 *               - duration
 *             properties:
 *               lessonId:
 *                 type: string
 *                 description: The ID of the lesson to structure slides for
 *               duration:
 *                 type: string
 *                 enum: ["5", "10", "15", "30", "45", "60", "90", "120"]
 *                 description: Planned presentation duration in minutes
 *               context:
 *                 type: string
 *                 maxLength: 500
 *                 description: Context guidelines or custom instructions for presentation planning
 *     responses:
 *       200:
 *         description: Slide outline planned successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (User does not have access to this lesson)
 *       404:
 *         description: Lesson not found
 *       500:
 *         description: Internal server error
 */
export const POST = withAuth(async (req, sessionData) => {
  try {
    const userId = sessionData.user.id;
    const body = await req.json();
    const parsed = planPresentationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Invalid data', errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { lessonId, duration, context, collection } = parsed.data;

    // Fetch template categories for custom collections so the AI can use
    // the template's own layout type names instead of the standard 16.
    // ('auto' means the AI picks the style — standard planning path.)
    let templateCategories: string[] | undefined;
    if (collection && collection !== 'auto') {
      templateCategories =
        await SlideService.getPlanningTemplateCategories(collection);
    }

    // Live style inventory (local + S3) for the AI's style recommendation.
    const styleCollections = await SlideService.getStyleCollections();

    const stream = PresentationService.planPresentationStream({
      lessonId,
      userId,
      duration,
      context,
      templateCategories,
      styleCollections,
    });

    return new Response(stream as unknown as ReadableStream<Uint8Array>, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error: any) {
    console.error('Plan presentation error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Invalid data', errors: error.flatten() },
        { status: 400 }
      );
    }
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
      {
        message: 'An internal error occurred while planning the presentation.',
      },
      { status: 500 }
    );
  }
});
