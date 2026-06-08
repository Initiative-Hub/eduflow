import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  TTSService,
  type OpenAITTSVoice,
  type PollyVoiceId,
  type TTSProvider,
} from '@/services/english/tts.service';

const bodySchema = z.object({
  text: z.string().min(1).max(3000),
  provider: z.enum(['openai', 'polly']).optional().default('openai'),
  voice: z
    .enum([
      'alloy',
      'ash',
      'coral',
      'echo',
      'fable',
      'onyx',
      'nova',
      'sage',
      'shimmer',
    ])
    .optional()
    .default('alloy'),
  voiceId: z
    .enum(['Joanna', 'Matthew', 'Ruth', 'Stephen'])
    .optional()
    .default('Joanna'),
});

/**
 * @swagger
 * /api/v1/english/tts:
 *   post:
 *     tags:
 *       - English
 *     summary: Synthesize English text to speech using OpenAI tts-1 by default
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
 *               voiceId:
 *                 type: string
 *                 enum: [Joanna, Matthew, Ruth, Stephen]
 *                 default: Joanna
 *               provider:
 *                 type: string
 *                 enum: [openai, polly]
 *                 default: openai
 *               voice:
 *                 type: string
 *                 enum: [alloy, ash, coral, echo, fable, onyx, nova, sage, shimmer]
 *                 default: alloy
 *     responses:
 *       200:
 *         description: MP3 audio stream
 *         content:
 *           audio/mpeg:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Invalid request body
 *       500:
 *         description: TTS synthesis failed
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

    const audioBuffer = await TTSService.synthesize({
      text: parsed.data.text,
      provider: parsed.data.provider as TTSProvider,
      voice: parsed.data.voice as OpenAITTSVoice,
      voiceId: parsed.data.voiceId as PollyVoiceId,
    });

    return new NextResponse(audioBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'TTS synthesis failed';
    console.error('[english tts route]', error);
    return NextResponse.json({ message }, { status: 500 });
  }
}
