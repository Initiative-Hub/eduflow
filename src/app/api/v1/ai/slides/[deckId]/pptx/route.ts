import { errorResponse } from '@/lib/api/error-response';
import { withAuth, withRoles } from '@/lib/api/middlewares';
import { LessonPresentationService } from '@/services/LessonPresentationService';

export const dynamic = 'force-dynamic';

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
export const GET = withAuth(
  withRoles(
    ['TEACHER'],
    async (
      _req: Request,
      _sessionData,
      { params }: { params: Promise<{ deckId: string }> }
    ) => {
      try {
        const { deckId } = await params;
        const pptxBuffer = await LessonPresentationService.getDeckPptx(deckId);

        return new Response(pptxBuffer, {
          status: 200,
          headers: {
            'Content-Type':
              'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'Content-Disposition': `attachment; filename="deck-${deckId}.pptx"`,
          },
        });
      } catch (error) {
        console.error('AI Slide Deck PPTX Export Error:', error);
        return errorResponse(
          'INTERNAL_ERROR',
          'Failed to export slide deck as PPTX',
          500
        );
      }
    }
  )
);
