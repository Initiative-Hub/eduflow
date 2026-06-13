import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import * as z from 'zod';
import {
  TranslationService,
  type TranslationProvider,
} from '@/services/english/translation.service';

const bodySchema = z.object({
  text: z.string().min(1).max(1000),
  from: z.string().default('en'),
  to: z.string().default('vi'),
  provider: z.enum(['amazon', 'mymemory', 'ai']).default('amazon'),
});

const VALID_PROVIDERS: TranslationProvider[] = ['amazon', 'mymemory', 'ai'];

/**
 * @swagger
 * /api/v1/english/translate:
 *   post:
 *     tags:
 *       - English
 *     summary: Translate text using the selected machine translation provider
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
 *               from:
 *                 type: string
 *                 default: en
 *               to:
 *                 type: string
 *                 default: vi
 *               provider:
 *                 type: string
 *                 enum: [amazon, mymemory, ai]
 *                 default: amazon
 *     responses:
 *       200:
 *         description: Translation result
 *       400:
 *         description: Invalid request body
 *       500:
 *         description: Translation failed
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

    const { text, from, to, provider } = parsed.data;

    if (!VALID_PROVIDERS.includes(provider)) {
      return NextResponse.json(
        {
          message: `Invalid provider. Must be one of: ${VALID_PROVIDERS.join(', ')}`,
        },
        { status: 400 }
      );
    }

    const result = await TranslationService.translate({
      text,
      from,
      to,
      provider,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Translation failed';
    console.error('[translate route]', error);
    return NextResponse.json({ message }, { status: 500 });
  }
}
