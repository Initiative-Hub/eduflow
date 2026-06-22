import { NextResponse } from 'next/server';
import * as z from 'zod';
import { withAuth } from '@/lib/api/middlewares';
import { SavedVocabularyService } from '@/services/english/SavedVocabularyService';

const paramsSchema = z.object({
  sessionId: z.string().uuid(),
});

const multipleChoiceAnswerSchema = z.object({
  type: z.literal('multiple_choice'),
  selectedOptionId: z.string(),
});

const submitReviewSessionSchema = z.object({
  answers: z.record(z.string(), multipleChoiceAnswerSchema),
});

/**
 * @swagger
 * /api/v1/english/wordbank/review-sessions/{sessionId}/submit:
 *   post:
 *     tags:
 *       - English
 *     summary: Submit a Wordbank review quiz
 *     security:
 *       - SessionCookie: []
 */
export const POST = withAuth(async (req, sessionData, { params }) => {
  const parsedParams = paramsSchema.safeParse(await params);

  if (!parsedParams.success) {
    return NextResponse.json(
      { message: 'Invalid request', errors: parsedParams.error.flatten() },
      { status: 400 }
    );
  }

  const raw = await req.json().catch(() => null);
  const parsedBody = submitReviewSessionSchema.safeParse(raw);

  if (!parsedBody.success) {
    return NextResponse.json(
      { message: 'Invalid request', errors: parsedBody.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const result = await SavedVocabularyService.submitReviewSession(
      sessionData.user.id,
      parsedParams.data.sessionId,
      parsedBody.data
    );
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : 'Could not submit review',
      },
      { status: 400 }
    );
  }
});
