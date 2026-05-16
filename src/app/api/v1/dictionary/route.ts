import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { DictionaryService } from '@/services/DictionaryService';

/**
 * @swagger
 * /api/v1/dictionary:
 *   get:
 *     tags:
 *       - Dictionary
 *     summary: Look up an English word definition
 *     parameters:
 *       - in: query
 *         name: word
 *         required: true
 *         schema:
 *           type: string
 *         description: The English word to look up
 *     responses:
 *       200:
 *         description: Word definition with phonetic and meanings
 *       400:
 *         description: Missing or invalid word parameter
 *       404:
 *         description: Word not found in dictionary
 *       500:
 *         description: Internal server error
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawWord = searchParams.get('word');

    if (!rawWord) {
      return NextResponse.json(
        { message: 'Missing "word" query parameter' },
        { status: 400 }
      );
    }

    const word = DictionaryService.cleanWord(rawWord);

    if (!word) {
      return NextResponse.json(
        { message: 'Invalid word provided' },
        { status: 400 }
      );
    }

    const entry = await DictionaryService.lookup(word);

    if (!entry) {
      return NextResponse.json(
        { message: `No definition found for "${word}"` },
        { status: 404 }
      );
    }

    return NextResponse.json(entry);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ message }, { status: 500 });
  }
}
