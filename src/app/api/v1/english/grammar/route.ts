import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { GrammarService } from '@/services/english/grammar.service';

const bodySchema = z.object({
  sentence: z.string().min(1).max(2000),
});

/**
 * @swagger
 * /api/v1/english/grammar:
 *   post:
 *     tags:
 *       - English
 *     summary: Analyze a sentence for grammar, spelling, and style issues
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [sentence]
 *             properties:
 *               sentence:
 *                 type: string
 *     responses:
 *       200:
 *         description: Grammar analysis result
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

    const result = await GrammarService.analyze(parsed.data.sentence);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Grammar analysis failed';
    return NextResponse.json({ message }, { status: 500 });
  }
}
