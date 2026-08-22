import { NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api/error-response';
import { withAuth } from '@/lib/api/middlewares';
import { pronunciationAssessmentRequestSchema } from '@/lib/validations/english-speech.schema';
import { PronunciationService } from '@/services/english/PronunciationService';

export const maxDuration = 60;

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
    const parsed = pronunciationAssessmentRequestSchema.safeParse({
      audio: formData.get('audio'),
      targetText: formData.get('targetText'),
      targetIpa: formData.get('targetIpa') || undefined,
    });

    if (!parsed.success) {
      return errorResponse(
        'INVALID_PRONUNCIATION_ASSESSMENT_REQUEST',
        'A non-empty audio file and target text are required.',
        400,
        parsed.error.flatten()
      );
    }

    const { audio: audioFile, targetIpa, targetText } = parsed.data;
    const arrayBuffer = await audioFile.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);
    const mimeType = audioFile.type || 'audio/webm';

    const transcript = await PronunciationService.transcribeAudio(
      audioBuffer,
      mimeType
    );

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
