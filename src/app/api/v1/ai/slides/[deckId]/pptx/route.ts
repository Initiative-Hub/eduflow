import { errorResponse } from '@/lib/api/error-response';
import { withRoles } from '@/lib/api/middlewares';
import { slideDeckIdSchema } from '@/lib/validation/slide-ai-image';
import {
  LessonPresentationService,
  SlideDeckAccessError,
} from '@/services/LessonPresentationService';

export const dynamic = 'force-dynamic';
// Rasterizing every slide takes roughly a second each, so a large deck needs far
// more than the platform default before the response can be returned.
export const maxDuration = 300;

// ─── GET /api/v1/ai/slides/{deckId}/pptx ───────────────────────────────────────

/**
 * @swagger
 * /api/v1/ai/slides/{deckId}/pptx:
 *   get:
 *     tags:
 *       - AI Slides
 *     summary: Export slide deck as a PPTX (PowerPoint) file
 *     security:
 *       - SessionCookie: []
 *     parameters:
 *       - in: path
 *         name: deckId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: PPTX file stream
 *         content:
 *           application/vnd.openxmlformats-officedocument.presentationml.presentation: {}
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Slide deck not found
 *       500:
 *         description: Internal server error
 */
export const GET = withRoles(
  ['TEACHER'],
  async (
    _req: Request,
    sessionData,
    { params }: { params: Promise<{ deckId: string }> }
  ) => {
    try {
      const routeParams = await params;
      const deckId = slideDeckIdSchema.safeParse(routeParams.deckId);
      if (!deckId.success) {
        return errorResponse('VALIDATION_ERROR', 'Invalid slide deck ID', 400);
      }
      await LessonPresentationService.assertDeckAccess({
        deckId: deckId.data,
        userId: sessionData.user.id,
        access: 'view',
      });
      const pptxBuffer = await LessonPresentationService.getDeckPptx(
        deckId.data
      );

      return new Response(pptxBuffer, {
        status: 200,
        headers: {
          'Content-Type':
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'Content-Disposition': `attachment; filename="deck-${deckId.data}.pptx"`,
        },
      });
    } catch (error) {
      if (error instanceof SlideDeckAccessError) {
        return errorResponse(
          error.code,
          error.message,
          error.code === 'NOT_FOUND' ? 404 : 403
        );
      }
      console.error('AI Slide Deck PPTX Export Error:', error);
      return errorResponse(
        'INTERNAL_ERROR',
        'Failed to export slide deck as PPTX',
        500
      );
    }
  }
);
