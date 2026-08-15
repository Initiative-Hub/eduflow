import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/middlewares';
import { PronunciationService } from '@/services/english/PronunciationService';

/**
 * @swagger
 * /api/v1/english/pronunciation/tts:
 *   post:
 *     tags:
 *       - English
 *     summary: Synthesize target text speech audio for pronunciation practice using OpenRouter TTS
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
 *         description: Missing text
 *       500:
 *         description: Server error
 */
export const POST = withAuth(async (req) => {
  try {
    const { text, voice } = (await req.json()) as {
      text?: string;
      voice?: string;
    };

    if (!text?.trim()) {
      return NextResponse.json(
        { message: 'Missing text parameter' },
        { status: 400 }
      );
    }

    const audioBuffer = await PronunciationService.synthesizeSpeech(
      text,
      voice || 'alloy'
    );

    return new Response(new Uint8Array(audioBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Speech synthesis failed';
    return NextResponse.json({ message }, { status: 500 });
  }
});
