import { NextResponse } from 'next/server';
import * as z from 'zod';
import { withAuth } from '@/lib/api/middlewares';
import { SavedVocabularyService } from '@/services/english/SavedVocabularyService';

const createReviewSessionSchema = z.object({
  listId: z.string().uuid().optional(),
  vocabularyIds: z.array(z.string().uuid()).min(1).max(100).optional(),
  limit: z.number().int().min(1).max(30).optional(),
});

/**
 * @swagger
 * /api/v1/english/wordbank/review-sessions:
 *   post:
 *     tags:
 *       - English
 *     summary: Create a due-word Wordbank review quiz
 *     security:
 *       - SessionCookie: []
 */
export const POST = withAuth(async (req, sessionData) => {
  const raw = await req.json().catch(() => ({}));
  const parsed = createReviewSessionSchema.safeParse(raw);

  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Invalid request', errors: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const result = await SavedVocabularyService.createReviewSession(
      sessionData.user.id,
      parsed.data
    );
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : 'Could not create review session',
      },
      { status: 400 }
    );
  }
});
