import { NextResponse } from 'next/server';
import { z } from 'zod';
import { errorResponse } from '@/lib/api/error-response';
import { withRoles } from '@/lib/api/middlewares';
import { generateDeckFromPlan } from '@/lib/slides';
import { LessonService } from '@/services/LessonService';
import { presentationPlanSchema } from '@/services/PresentationService';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// ─── Validation Schema ────────────────────────────────────────────────────────

const generateDeckSchema = presentationPlanSchema.extend({
  lessonId: z.string().min(1, 'lessonId is required'),
  title: z.string().min(1, 'title is required'),
  palette: z.string().min(1).optional().default('auto'),
});

// ─── POST /api/v1/ai/slides ───────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/ai/slides:
 *   post:
 *     tags:
 *       - AI Slides
 *     summary: Render a slide deck from a presentation plan via the external slide service
 *     security:
 *       - SessionCookie: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [lessonId, title, slides]
 *             properties:
 *               lessonId:
 *                 type: string
 *                 description: Lesson the deck belongs to (the deck reference is saved on it)
 *               title:
 *                 type: string
 *                 description: Presentation title
 *               palette:
 *                 type: string
 *                 description: Color palette selection (auto, corporate, modern, ...)
 *               slides:
 *                 type: array
 *                 description: Ordered slide plan produced by /api/v1/presentation/plan
 *                 items:
 *                   type: object
 *                   required: [layoutType, slideTitle, bindings]
 *                   properties:
 *                     layoutType:
 *                       type: string
 *                     slideTitle:
 *                       type: string
 *                     bindings:
 *                       type: object
 *     responses:
 *       200:
 *         description: Deck rendered successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export const POST = withRoles(
  ['TEACHER'],
  async (req: Request, sessionData) => {
    try {
      const body = await req.json();
      const parsed = generateDeckSchema.safeParse(body);

      if (!parsed.success) {
        return errorResponse(
          'VALIDATION_ERROR',
          'Invalid slide plan input',
          400,
          parsed.error.format()
        );
      }

      const { lessonId, title, palette, slides } = parsed.data;

      const deck = await generateDeckFromPlan({ title, palette, slides });

      // Persist the deck reference so the lesson can re-open it later without
      // regenerating. Don't fail the whole request if only the save errors —
      // the deck is already rendered and viewable this session.
      const warnings = [...deck.warnings];
      try {
        await LessonService.saveLessonPresentation(
          lessonId,
          sessionData.user.id,
          { deckId: deck.deckId, deckKey: deck.s3Key }
        );
      } catch (saveError) {
        console.error('Failed to persist slide deck reference:', saveError);
        warnings.push('Deck generated but could not be saved to the lesson.');
      }

      return NextResponse.json(
        {
          deckId: deck.deckId,
          deckUrl: `/api/v1/ai/slides/${deck.deckId}`,
          slides: deck.slides,
          warnings,
          usage: deck.usage,
        },
        { status: 200 }
      );
    } catch (error) {
      console.error('AI Slide Generation Error:', error);
      if (error instanceof Error && error.message.includes('timed out')) {
        return errorResponse('TIMEOUT', error.message, 504);
      }
      return errorResponse(
        'INTERNAL_ERROR',
        'Failed to generate slide deck',
        500
      );
    }
  }
);
