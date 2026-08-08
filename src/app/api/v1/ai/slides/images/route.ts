import { NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api/error-response';
import { withRoles } from '@/lib/api/middlewares';
import { slideAiImageRequestSchema } from '@/lib/validation/slide-ai-image';
import {
  LessonPresentationService,
  SlideDeckAccessError,
} from '@/services/LessonPresentationService';
import { SlideImageGenerationService } from '@/services/SlideImageGenerationService';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * @swagger
 * /api/v1/ai/slides/images:
 *   post:
 *     tags:
 *       - AI Slides
 *     summary: Generate and store a replacement image for a slide element
 *     security:
 *       - SessionCookie: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [deckId, prompt, aspectRatio]
 *             properties:
 *               deckId:
 *                 type: string
 *               prompt:
 *                 type: string
 *               aspectRatio:
 *                 type: string
 *                 enum: [1:1, 1:2, 2:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9]
 *     responses:
 *       200:
 *         description: Stable URL for the generated slide image
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Image generation failed
 */
export const POST = withRoles(
  ['TEACHER'],
  async (request: Request, sessionData) => {
    try {
      const parsed = slideAiImageRequestSchema.safeParse(await request.json());
      if (!parsed.success) {
        return errorResponse(
          'VALIDATION_ERROR',
          'Invalid slide image generation request',
          400,
          parsed.error.format()
        );
      }

      await LessonPresentationService.assertDeckAccess({
        deckId: parsed.data.deckId,
        userId: sessionData.user.id,
        access: 'update',
      });
      const result = await SlideImageGenerationService.generate(parsed.data);
      return NextResponse.json(result);
    } catch (error) {
      if (error instanceof SlideDeckAccessError) {
        return errorResponse(
          error.code,
          error.message,
          error.code === 'NOT_FOUND' ? 404 : 403
        );
      }
      console.error('AI Slide Image Generation Error:', error);
      return errorResponse(
        'INTERNAL_ERROR',
        'Failed to generate slide image with AI',
        500
      );
    }
  }
);
