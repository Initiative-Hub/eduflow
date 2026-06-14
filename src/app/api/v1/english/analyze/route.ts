import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import * as z from 'zod';
import { VocabularyService } from '@/services/english/VocabularyService';

const bodySchema = z.object({
  text: z.string().min(1).max(1000),
});

/**
 * @swagger
 * /api/v1/english/analyze:
 *   post:
 *     tags:
 *       - English
 *     summary: Extract key vocabulary from English text using AI IPA and Merriam-Webster audio
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [text]
 *             properties:
 *               text:
 *                 type: string
 *     responses:
 *       200:
 *         description: Vocabulary list and sentence segments
 *       400:
 *         description: Invalid request body
 *       500:
 *         description: Analysis failed
 */
export async function POST(req: NextRequest) {
  try {
    const raw = await req.json();
    const parsed = bodySchema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Invalid request', errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await VocabularyService.analyze(parsed.data.text);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Analysis failed';
    return NextResponse.json({ message }, { status: 500 });
  }
}
