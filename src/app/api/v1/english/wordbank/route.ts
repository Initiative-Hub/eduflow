import { NextResponse } from 'next/server';
import * as z from 'zod';
import { withAuth } from '@/lib/api/middlewares';
import { SavedVocabularyService } from '@/services/english/SavedVocabularyService';

const vocabularyItemSchema = z.object({
  word: z.string().min(1).max(80),
  partOfSpeech: z.string().min(1).max(80),
  ipa: z.string().max(120).nullable().optional().default(null),
  audioUrl: z.string().max(2048).nullable().optional().default(null),
  englishDefinition: z.string().min(1).max(600),
  vietnameseTranslation: z.string().min(1).max(600),
  exampleSentence: z.string().min(1).max(700),
  sourceSnippet: z.string().max(1000).nullable().optional().default(null),
});

const saveBodySchema = z.object({
  vocabulary: z.array(vocabularyItemSchema).min(1).max(50),
});

const removeBodySchema = z.object({
  word: z.string().min(1).max(80),
});

/**
 * @swagger
 * /api/v1/english/wordbank:
 *   get:
 *     tags:
 *       - English
 *     summary: List saved vocabulary for the current user
 *     security:
 *       - SessionCookie: []
 *     responses:
 *       200:
 *         description: Saved vocabulary items
 *       401:
 *         description: Unauthorized
 */
export const GET = withAuth(async (_req, sessionData) => {
  const result = await SavedVocabularyService.list(sessionData.user.id);
  return NextResponse.json(result);
});

/**
 * @swagger
 * /api/v1/english/wordbank:
 *   post:
 *     tags:
 *       - English
 *     summary: Save vocabulary words to the current user's wordbank
 *     security:
 *       - SessionCookie: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Save result
 *       400:
 *         description: Invalid request body
 *       401:
 *         description: Unauthorized
 */
export const POST = withAuth(async (req, sessionData) => {
  const raw = await req.json().catch(() => null);
  const parsed = saveBodySchema.safeParse(raw);

  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Invalid request', errors: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const result = await SavedVocabularyService.saveMany(
    sessionData.user.id,
    parsed.data.vocabulary
  );
  return NextResponse.json(result);
});

/**
 * @swagger
 * /api/v1/english/wordbank:
 *   delete:
 *     tags:
 *       - English
 *     summary: Remove a vocabulary word from the current user's wordbank
 *     security:
 *       - SessionCookie: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Remove result
 *       400:
 *         description: Invalid request body
 *       401:
 *         description: Unauthorized
 */
export const DELETE = withAuth(async (req, sessionData) => {
  const raw = await req.json().catch(() => null);
  const parsed = removeBodySchema.safeParse(raw);

  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Invalid request', errors: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const result = await SavedVocabularyService.remove(
    sessionData.user.id,
    parsed.data.word
  );
  return NextResponse.json(result);
});
