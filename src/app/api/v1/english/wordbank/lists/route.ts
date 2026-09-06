import { NextResponse } from 'next/server';
import * as z from 'zod';
import { withAuth } from '@/lib/api/middlewares';
import { SavedVocabularyService } from '@/services/english/SavedVocabularyService';

const createListBodySchema = z.object({
  name: z.string().trim().min(1).max(80),
  colorCode: z.string().trim().max(80).nullable().optional().default(null),
});

/**
 * @swagger
 * /api/v1/english/wordbank/lists:
 *   get:
 *     tags:
 *       - English
 *     summary: List vocabulary lists for the current user
 *     security:
 *       - SessionCookie: []
 */
export const GET = withAuth(async (_req, sessionData) => {
  const lists = await SavedVocabularyService.listLists(sessionData.user.id);
  return NextResponse.json({ lists });
});

/**
 * @swagger
 * /api/v1/english/wordbank/lists:
 *   post:
 *     tags:
 *       - English
 *     summary: Create a vocabulary list for the current user
 *     security:
 *       - SessionCookie: []
 */
export const POST = withAuth(async (req, sessionData) => {
  const raw = await req.json().catch(() => null);
  const parsed = createListBodySchema.safeParse(raw);

  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Invalid request', errors: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const list = await SavedVocabularyService.createList(
      sessionData.user.id,
      parsed.data
    );
    return NextResponse.json({ list }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : 'Could not create Word List',
      },
      { status: 400 }
    );
  }
});
