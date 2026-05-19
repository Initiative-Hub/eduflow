import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import {
  type DictionaryProviderId,
  DictionaryRateLimitError,
  DictionaryService,
} from '@/services/dictionary';

const VALID_PROVIDERS: DictionaryProviderId[] = [
  'free-dictionary',
  'mw-collegiate',
  'mw-learners',
];

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
 *       - in: query
 *         name: provider
 *         required: false
 *         schema:
 *           type: string
 *           enum: [free-dictionary, mw-collegiate, mw-learners]
 *           default: free-dictionary
 *         description: Dictionary provider to use
 *     responses:
 *       200:
 *         description: Word definition with phonetic and meanings
 *       400:
 *         description: Missing or invalid word parameter
 *       404:
 *         description: Word not found in dictionary
 *       429:
 *         description: Rate limit exceeded for the selected provider
 *       500:
 *         description: Internal server error
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawWord = searchParams.get('word');
    const providerParam = searchParams.get('provider') || 'free-dictionary';

    if (!rawWord) {
      return NextResponse.json(
        { message: 'Missing "word" query parameter' },
        { status: 400 }
      );
    }

    if (!VALID_PROVIDERS.includes(providerParam as DictionaryProviderId)) {
      return NextResponse.json(
        {
          message: `Invalid provider. Must be one of: ${VALID_PROVIDERS.join(', ')}`,
        },
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

    const entry = await DictionaryService.lookup(
      word,
      providerParam as DictionaryProviderId
    );

    if (!entry) {
      return NextResponse.json(
        { message: `No definition found for "${word}"` },
        { status: 404 }
      );
    }

    return NextResponse.json(entry);
  } catch (error: unknown) {
    if (error instanceof DictionaryRateLimitError) {
      return NextResponse.json(
        {
          message:
            'Daily request limit reached for this dictionary. Please try another provider.',
          code: 'RATE_LIMIT_EXCEEDED',
          providerId: error.providerId,
        },
        { status: 429 }
      );
    }

    const message =
      error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ message }, { status: 500 });
  }
}
