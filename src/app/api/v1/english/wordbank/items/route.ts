import { NextResponse } from 'next/server';
import * as z from 'zod';
import { withAuth } from '@/lib/api/middlewares';
import { SavedVocabularyService } from '@/services/english/SavedVocabularyService';

const updateItemsBodySchema = z.object({
  vocabularyIds: z.array(z.string().uuid()).min(1).max(200),
  addListIds: z.array(z.string().uuid()).max(50).optional(),
  removeListIds: z.array(z.string().uuid()).max(50).optional(),
  masteryLevel: z.number().int().min(0).max(2).optional(),
  exampleSentence: z.string().max(1000).optional(),
  examples: z.array(z.string().max(1000)).max(50).optional(),
});

/**
 * @swagger
 * /api/v1/english/wordbank/items:
 *   patch:
 *     tags:
 *       - English
 *     summary: Bulk update saved vocabulary items
 *     security:
 *       - SessionCookie: []
 */
export const PATCH = withAuth(async (req, sessionData) => {
  const raw = await req.json().catch(() => null);
  const parsed = updateItemsBodySchema.safeParse(raw);

  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Invalid request', errors: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const result = await SavedVocabularyService.updateItems(
    sessionData.user.id,
    parsed.data
  );

  return NextResponse.json(result);
});
