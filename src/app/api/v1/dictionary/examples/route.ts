import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { DictionaryService } from '@/services/dictionary';

const querySchema = z.object({
  word: z.string().trim().min(1),
});

/**
 * @swagger
 * /api/v1/dictionary/examples:
 *   get:
 *     tags:
 *       - Dictionary
 *     summary: Crawl example sentences and Vietnamese translations for a word
 *     parameters:
 *       - in: query
 *         name: word
 *         required: true
 *         schema:
 *           type: string
 *         description: The target word to fetch examples for
 *     responses:
 *       200:
 *         description: List of parsed example sentences
 *       400:
 *         description: Missing or empty word parameter
 *       500:
 *         description: Server error
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawWord = searchParams.get('word') || searchParams.get('q') || '';

    const validation = querySchema.safeParse({ word: rawWord });
    if (!validation.success) {
      return NextResponse.json(
        {
          message: 'Missing or empty word parameter',
          word: rawWord,
          examples: [],
        },
        { status: 400 }
      );
    }

    const details = await DictionaryService.fetchLabanDetails(
      validation.data.word
    );
    return NextResponse.json({
      word: validation.data.word,
      ipa: details.ipa,
      audioUrl: details.audioUrl,
      examples: details.examples,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ message, examples: [] }, { status: 500 });
  }
}
