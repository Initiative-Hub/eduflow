import { NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api/error-response';
import { withRoles } from '@/lib/api/middlewares';
import { slideAiEditRequestSchema } from '@/lib/validation/slide-ai-edit';
import { SlideContentEditService } from '@/services/SlideContentEditService';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * @swagger
 * /api/v1/ai/slides/edit:
 *   post:
 *     tags:
 *       - AI Slides
 *     summary: Rewrite selected presentation text or all text on one slide
 *     security:
 *       - SessionCookie: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [scope, instruction, items]
 *             properties:
 *               scope:
 *                 type: string
 *                 enum: [element, slide]
 *               instruction:
 *                 type: string
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [id, text, maxCharacters]
 *                   properties:
 *                     id:
 *                       type: string
 *                     text:
 *                       type: string
 *                     maxCharacters:
 *                       type: integer
 *     responses:
 *       200:
 *         description: Rewritten slide text
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: AI editing failed
 */
export const POST = withRoles(['TEACHER'], async (request: Request) => {
  try {
    const parsed = slideAiEditRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse(
        'VALIDATION_ERROR',
        'Invalid slide editing request',
        400,
        parsed.error.format()
      );
    }

    const result = await SlideContentEditService.rewrite(parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    console.error('AI Slide Text Editing Error:', error);
    return errorResponse(
      'INTERNAL_ERROR',
      'Failed to edit slide content with AI',
      500
    );
  }
});
