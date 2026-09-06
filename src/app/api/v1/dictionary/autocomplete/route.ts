import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { DictionaryService } from '@/services/dictionary';

const autocompleteQuerySchema = z.object({
  query: z.string().trim().min(1),
});

/**
 * @swagger
 * /api/v1/dictionary/autocomplete:
 *   get:
 *     tags:
 *       - Dictionary
 *     summary: Fetch English-Vietnamese vocabulary autocomplete suggestions
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: The search prefix or keyword for vocabulary autocomplete
 *     responses:
 *       200:
 *         description: Autocomplete suggestions list
 *       400:
 *         description: Missing or empty query parameter
 *       500:
 *         description: Internal server error or upstream provider issue
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawQuery = searchParams.get('query') || searchParams.get('q') || '';

    const validation = autocompleteQuerySchema.safeParse({ query: rawQuery });
    if (!validation.success) {
      return NextResponse.json(
        { message: 'Missing or empty query parameter', suggestions: [] },
        { status: 400 }
      );
    }

    const result = await DictionaryService.autocomplete(validation.data.query);
    return NextResponse.json(result);
  } catch (_error: unknown) {
    const { searchParams } = new URL(req.url);
    const rawQuery = searchParams.get('query') || searchParams.get('q') || '';
    return NextResponse.json(
      { query: rawQuery, suggestions: [] },
      { status: 200 }
    );
  }
}
