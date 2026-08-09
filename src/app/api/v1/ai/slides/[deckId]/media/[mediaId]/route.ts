import { errorResponse } from '@/lib/api/error-response';
import { withRoles } from '@/lib/api/middlewares';
import {
  slideDeckIdSchema,
  slideMediaIdSchema,
} from '@/lib/validation/slide-ai-image';
import {
  LessonPresentationService,
  SlideDeckAccessError,
} from '@/services/LessonPresentationService';
import { StorageService } from '@/services/StorageService';

export const dynamic = 'force-dynamic';

/**
 * @swagger
 * /api/v1/ai/slides/{deckId}/media/{mediaId}:
 *   get:
 *     tags:
 *       - AI Slides
 *     summary: Retrieve an AI-generated image stored with a slide deck
 *     security:
 *       - SessionCookie: []
 *     parameters:
 *       - in: path
 *         name: deckId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: mediaId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Generated image bytes
 *       400:
 *         description: Invalid path parameters
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Image retrieval failed
 */
export const GET = withRoles(
  ['TEACHER'],
  async (
    _request: Request,
    sessionData,
    { params }: { params: Promise<{ deckId: string; mediaId: string }> }
  ) => {
    try {
      const routeParams = await params;
      const deckId = slideDeckIdSchema.safeParse(routeParams.deckId);
      const mediaId = slideMediaIdSchema.safeParse(routeParams.mediaId);
      if (!deckId.success || !mediaId.success) {
        return errorResponse(
          'VALIDATION_ERROR',
          'Invalid slide media path',
          400
        );
      }

      await LessonPresentationService.assertDeckAccess({
        deckId: deckId.data,
        userId: sessionData.user.id,
        access: 'view',
      });
      const { bytes, contentType } =
        await StorageService.getSlideGeneratedImage({
          deckId: deckId.data,
          mediaId: mediaId.data,
        });
      const body = bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength
      ) as ArrayBuffer;

      return new Response(body, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'private, max-age=31536000, immutable',
          'X-Content-Type-Options': 'nosniff',
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
      console.error('AI Slide Media Fetch Error:', error);
      return errorResponse(
        'INTERNAL_ERROR',
        'Failed to retrieve slide image',
        500
      );
    }
  }
);
