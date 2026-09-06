import { NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api/error-response';
import { withAuth } from '@/lib/api/middlewares';
import { englishTTSRequestSchema } from '@/lib/validations/english-speech.schema';
import { PronunciationService } from '@/services/english/PronunciationService';

export const maxDuration = 60;

/**
 * @swagger
 * /api/v1/english/tts:
 *   post:
 *     tags:
 *       - English
 *     summary: Synthesize text to speech audio for English sentences
 *     security:
 *       - SessionCookie: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *               voice:
 *                 type: string
 *     responses:
 *       200:
 *         description: Audio stream (audio/mpeg)
 *       400:
 *         description: Missing text parameter
 *       500:
 *         description: Speech synthesis failed
 */
export const POST = withAuth(async (req) => {
  try {
    const body = await req.json().catch(() => null);
    const parsed = englishTTSRequestSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(
        'INVALID_TTS_REQUEST',
        'Text must be between 1 and 3000 characters and voice must be supported.',
        400,
        parsed.error.flatten()
      );
    }

    const { text } = parsed.data;

    const audioBuffer = await PronunciationService.synthesizeSpeech(text);

    return new Response(new Uint8Array(audioBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Speech synthesis failed';
    return NextResponse.json({ message }, { status: 500 });
  }
});
