import { errorResponse } from '@/lib/api/error-response';
import { withRoles } from '@/lib/api/middlewares';
import { slideDeckIdSchema } from '@/lib/validation/slide-ai-image';
import {
  LessonPresentationService,
  SlideDeckAccessError,
} from '@/services/LessonPresentationService';

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
      const html = await LessonPresentationService.getDeckHtml(deckId.data);

      return new Response(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
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
      console.error('AI Slide Deck Fetch Error:', error);
      if (error instanceof Error && error.message === 'Deck not found') {
        return errorResponse('NOT_FOUND', 'Deck not found', 404);
      }
      return errorResponse('INTERNAL_ERROR', 'Failed to fetch slide deck', 500);
    }
  }
);

export const PUT = withRoles(
  ['TEACHER'],
  async (
    req: Request,
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
        access: 'update',
      });
      const body = await req.json();
      const { html } = body;

      if (!html) {
        return errorResponse('VALIDATION_ERROR', 'Missing HTML content', 400);
      }

      await LessonPresentationService.saveDeckHtml(deckId.data, html);

      return new Response(JSON.stringify({ status: 'success' }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
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
      console.error('AI Slide Deck Save Error:', error);
      return errorResponse('INTERNAL_ERROR', 'Failed to save slide deck', 500);
    }
  }
);
