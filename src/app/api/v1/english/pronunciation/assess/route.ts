import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/middlewares';
import { PronunciationService } from '@/services/english/PronunciationService';

/**
 * @swagger
 * /api/v1/english/pronunciation/assess:
 *   post:
 *     tags:
 *       - English
 *     summary: Transcribe user audio and evaluate pronunciation accuracy against target sentence
 *     security:
 *       - SessionCookie: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               audio:
 *                 type: string
 *                 format: binary
 *               targetText:
 *                 type: string
 *     responses:
 *       200:
 *         description: Pronunciation assessment result with percentage score
 *       400:
 *         description: Missing audio or targetText
 *       500:
 *         description: Server error
 */
export const POST = withAuth(async (req) => {
  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File | null;
    const targetText = (formData.get('targetText') as string) || '';

    if (!audioFile) {
      return NextResponse.json(
        { message: 'Missing audio file in request' },
        { status: 400 }
      );
    }

    if (!targetText.trim()) {
      return NextResponse.json(
        { message: 'Missing targetText in request' },
        { status: 400 }
      );
    }

    const arrayBuffer = await audioFile.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);
    const mimeType = audioFile.type || 'audio/webm';

    const transcript = await PronunciationService.transcribeAudio(
      audioBuffer,
      mimeType
    );

    const targetIpa = (formData.get('targetIpa') as string) || undefined;

    const assessment = await PronunciationService.assessPronunciationWithAI(
      targetText,
      transcript,
      targetIpa
    );

    return NextResponse.json(assessment);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Pronunciation analysis failed';
    return NextResponse.json({ message }, { status: 500 });
  }
});
