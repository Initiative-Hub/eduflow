import { errorResponse } from '@/lib/api/error-response';
import { withAuth, withRoles } from '@/lib/api/middlewares';
import { getDeckHtml } from '@/lib/slides';

export const dynamic = 'force-dynamic';

// ─── GET /api/v1/ai/slides/{deckId} ───────────────────────────────────────────

/**
 * @swagger
 * /api/v1/ai/slides/{deckId}:
 *   get:
 *     tags:
 *       - AI Slides
 *     summary: Retrieve the rendered HTML for a generated slide deck
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
 *         description: Deck HTML document
 *         content:
 *           text/html: {}
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Deck not found
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
        const html = await getDeckHtml(deckId);

        return new Response(html, {
          status: 200,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'private, max-age=3600',
          },
        });
      } catch (error) {
        console.error('AI Slide Deck Fetch Error:', error);
        if (error instanceof Error && error.message === 'Deck not found') {
          return errorResponse('NOT_FOUND', 'Deck not found', 404);
        }
        return errorResponse(
          'INTERNAL_ERROR',
          'Failed to fetch slide deck',
          500
        );
      }
    }
  )
);
