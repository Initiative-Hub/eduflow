import { NextResponse } from 'next/server';
import { z } from 'zod';
import { errorResponse } from '@/lib/api/error-response';
import { withRoles } from '@/lib/api/middlewares';
import { GammaService } from '@/services/GammaService';
import { LessonService } from '@/services/LessonService';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const generateGammaSchema = z.object({
  lessonId: z.string().min(1, 'lessonId is required'),
  title: z.string().min(1, 'title is required'),
  duration: z.string().min(1, 'duration is required'),
  context: z.string().max(5_000).optional(),
  collection: z.string().optional(),
  themeId: z.string().optional(),
  exportAs: z.enum(['pptx', 'pdf', 'png']).optional().default('pptx'),
  language: z.string().optional(),
});

/**
 * @swagger
 * /api/v1/presentation/gamma:
 *   post:
 *     tags:
 *       - Presentation
 *     summary: Generate a Gamma presentation from lesson content
 *     security:
 *       - SessionCookie: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [lessonId, title, duration]
 *             properties:
 *               lessonId:
 *                 type: string
 *               title:
 *                 type: string
 *               duration:
 *                 type: string
 *               context:
 *                 type: string
 *               collection:
 *                 type: string
 *               themeId:
 *                 type: string
 *               exportAs:
 *                 type: string
 *                 enum: [pptx, pdf, png]
 *               language:
 *                 type: string
 *     responses:
 *       200:
 *         description: Gamma presentation generated successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Lesson not found
 *       500:
 *         description: Internal server error
 */
export const POST = withRoles(
  ['TEACHER'],
  async (req: Request, sessionData) => {
    try {
      const body = await req.json();
      const parsed = generateGammaSchema.safeParse(body);

      if (!parsed.success) {
        return errorResponse(
          'VALIDATION_ERROR',
          'Invalid Gamma presentation input',
          400,
          parsed.error.format()
        );
      }

      const {
        lessonId,
        title,
        duration,
        context,
        collection,
        themeId,
        exportAs,
        language,
      } = parsed.data;

      const lesson = await LessonService.getLessonById(
        lessonId,
        sessionData.user.id
      );

      if (!lesson) {
        return errorResponse('NOT_FOUND', 'Lesson not found', 404);
      }

      const result = await GammaService.generatePresentation({
        title,
        duration,
        context,
        collection,
        themeId,
        exportAs,
        language,
        lessonTitle: lesson.title,
        lessonContent: lesson.content,
      });

      // Save the generated Gamma presentation reference in the database
      try {
        await LessonService.saveLessonPresentation(
          lessonId,
          sessionData.user.id,
          {
            deckId: `gamma:${result.gammaUrl}`,
            deckKey: result.gammaId || undefined,
          }
        );
      } catch (saveError) {
        console.error(
          'Failed to persist Gamma presentation reference:',
          saveError
        );
      }

      return NextResponse.json(result, { status: 200 });
    } catch (error) {
      console.error('Gamma Presentation Error:', error);

      const message =
        error instanceof Error
          ? error.message
          : 'Failed to generate Gamma presentation';

      if (message.includes('timed out')) {
        return errorResponse('TIMEOUT', message, 504);
      }

      if (message.includes('Missing GAMMA_API_KEY')) {
        return errorResponse('CONFIG_ERROR', message, 500);
      }

      if (message.includes('Gamma API')) {
        return errorResponse('UPSTREAM_ERROR', message, 502);
      }

      return errorResponse('INTERNAL_ERROR', message, 500);
    }
  }
);
