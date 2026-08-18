import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { OpenRouter } from '@openrouter/sdk';
import { generateText, Output } from 'ai';
import * as z from 'zod';
import { DEFAULT_MODELS } from '@/services/ai/chat-provider.constants';

const OPENROUTER_STT_MODEL = 'openai/whisper-large-v3';
const OPENROUTER_TTS_MODEL = 'mistralai/voxtral-mini-tts-2603';
const OPENROUTER_TTS_MODEL_VOICE = 'en_paul_excited';
const OPENROUTER_SPEECH_TIMEOUT_MS = 60_000;

export interface PhoneticTip {
  word: string;
  ipa?: string;
  issue: string;
  tip: string;
}

export interface PronunciationAssessmentResult {
  transcript: string;
  targetText: string;
  score: number;
  matchedWords: string[];
  missingWords: string[];
  feedback: string;
  spokenIpa?: string;
  phoneticTips?: PhoneticTip[];
}

export class PronunciationService {
  static async transcribeAudio(
    audioBuffer: Buffer,
    mimeType = 'audio/webm'
  ): Promise<string> {
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      throw new Error('Missing OPENROUTER_API_KEY for speech services');
    }

    const client = new OpenRouter({
      apiKey,
      appTitle: 'EduFlow',
      timeoutMs: OPENROUTER_SPEECH_TIMEOUT_MS,
    });

    try {
      const response = await client.stt.createTranscription({
        sttRequest: {
          inputAudio: {
            data: audioBuffer.toString('base64'),
            format: getAudioFormat(mimeType),
          },
          language: 'en',
          model: OPENROUTER_STT_MODEL,
        },
      });

      return response.text.trim();
    } catch (error) {
      throw createOpenRouterSpeechError('Speech-to-text', error);
    }
  }

  /**
   * Compare transcribed user speech against target word / sentence
   * and calculate pronunciation match accuracy percentage (0-100%).
   */
  static assessPronunciation(
    targetText: string,
    transcribedText: string
  ): PronunciationAssessmentResult {
    const cleanWord = (w: string) =>
      w
        .toLowerCase()
        .replace(/[^a-z0-9']/g, '')
        .trim();

    const targetTokens = targetText.split(/\s+/).filter(Boolean);
    const targetClean = targetTokens.map(cleanWord).filter(Boolean);

    const transcriptClean = transcribedText
      .split(/\s+/)
      .map(cleanWord)
      .filter(Boolean);

    const transcriptCounts = new Map<string, number>();
    for (const token of transcriptClean) {
      transcriptCounts.set(token, (transcriptCounts.get(token) ?? 0) + 1);
    }

    const matchedWords: string[] = [];
    const missingWords: string[] = [];

    targetTokens.forEach((originalToken, idx) => {
      const cleaned = targetClean[idx];
      const remaining = cleaned ? (transcriptCounts.get(cleaned) ?? 0) : 0;
      if (cleaned && remaining > 0) {
        matchedWords.push(originalToken);
        transcriptCounts.set(cleaned, remaining - 1);
      } else {
        missingWords.push(originalToken);
      }
    });

    const score =
      targetClean.length > 0
        ? Math.round((matchedWords.length / targetClean.length) * 100)
        : 100;

    let feedback = 'Keep practicing!';
    if (score >= 90) feedback = 'Excellent! Perfect pronunciation!';
    else if (score >= 75) feedback = 'Great job! Very clear pronunciation.';
    else if (score >= 50)
      feedback = 'Good attempt! Try speaking a bit clearer.';

    return {
      transcript: transcribedText,
      targetText,
      score,
      matchedWords,
      missingWords,
      feedback,
    };
  }

  /**
   * Deep AI phonetic pronunciation analysis using Vercel AI SDK (generateText + Output.object).
   */
  static async assessPronunciationWithAI(
    targetText: string,
    transcribedText: string,
    targetIpa?: string
  ): Promise<PronunciationAssessmentResult> {
    const baseAssessment = PronunciationService.assessPronunciation(
      targetText,
      transcribedText
    );

    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return baseAssessment;
    }

    try {
      const provider = createOpenRouter({ apiKey });
      const model = provider(DEFAULT_MODELS.openrouter);
      const phoneticAnalysisSchema = z.object({
        score: z
          .number()
          .describe('Overall match score percentage from 0 to 100'),
        matchedWords: z
          .array(z.string())
          .describe('Words from target sentence correctly spoken'),
        missingWords: z
          .array(z.string())
          .describe('Words from target sentence mispronounced or skipped'),
        feedback: z
          .string()
          .describe('Encouraging 1-sentence feedback note for speaker'),
        spokenIpa: z
          .string()
          .optional()
          .describe(
            'IPA phonemic transcription of what the user actually pronounced in slashes e.g. /ˈhiː wɒz ɪl iːt/'
          ),
        phoneticTips: z
          .array(
            z.object({
              word: z
                .string()
                .describe('The mispronounced or challenging target word'),
              ipa: z
                .string()
                .optional()
                .describe('IPA phonemic notation if known'),
              issue: z
                .string()
                .describe('Explanation of what sound was missed'),
              tip: z
                .string()
                .describe(
                  'Actionable tip on mouth/tongue position to pronounce it accurately'
                ),
            })
          )
          .describe('Phonetic coaching tips for mispronounced words'),
      });

      const { output } = await generateText({
        model,
        output: Output.object({ schema: phoneticAnalysisSchema }),
        system: `
          You are an expert English pronunciation coach and phonetician.
          Analyze the user's spoken audio transcript against the target sentence.

          Target Sentence: "${targetText}"
          Target Word IPA: "${targetIpa ?? ''}"
          Spoken Recognized Speech: "${transcribedText}"

          Determine:
          1. Which words were correctly spoken vs mispronounced/dropped.
          2. An accuracy percentage score (0-100%).
          3. The IPA phonemic transcription of what the user actually pronounced (spokenIpa).
          4. Actionable phonetic tips for any mispronounced or omitted words.
          5. Encouraging overall feedback.
        `,
        prompt: `Evaluate pronunciation accuracy for target: "${targetText}" with recognized speech: "${transcribedText}".`,
      });

      const missingWords =
        output?.missingWords?.length > 0
          ? output.missingWords
          : baseAssessment.missingWords;

      const matchedWords =
        output?.matchedWords?.length > 0
          ? output.matchedWords
          : baseAssessment.matchedWords;

      const phoneticTips =
        output?.phoneticTips && output.phoneticTips.length > 0
          ? output.phoneticTips
          : missingWords.map((word) => ({
              word,
              ipa: targetIpa ?? undefined,
              issue: `The word "${word}" was mispronounced or not clearly recognized in your spoken audio.`,
              tip: `Practice pronouncing "${word}" slowly, focusing on clear articulation of each syllable.`,
            }));

      return {
        transcript: transcribedText,
        targetText,
        score: output?.score ?? baseAssessment.score,
        matchedWords,
        missingWords,
        feedback: output?.feedback || baseAssessment.feedback,
        spokenIpa: output?.spokenIpa,
        phoneticTips,
      };
    } catch {
      // Fallback cleanly to base assessment with generated tips for missing words
      const fallbackTips = baseAssessment.missingWords.map((word) => ({
        word,
        ipa: targetIpa ?? undefined,
        issue: `The word "${word}" was mispronounced or not clearly recognized in your spoken audio.`,
        tip: `Practice pronouncing "${word}" slowly, focusing on clear articulation of each syllable.`,
      }));

      return {
        ...baseAssessment,
        phoneticTips: fallbackTips,
      };
    }
  }

  /** Synthesizes English speech through OpenRouter. */
  static async synthesizeSpeech(text: string): Promise<Buffer> {
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      throw new Error('Missing OPENROUTER_API_KEY for speech services');
    }

    const client = new OpenRouter({
      apiKey,
      appTitle: 'EduFlow',
      timeoutMs: OPENROUTER_SPEECH_TIMEOUT_MS,
    });

    try {
      const audioStream = await client.tts.createSpeech({
        speechRequest: {
          input: text,
          model: OPENROUTER_TTS_MODEL,
          voice: OPENROUTER_TTS_MODEL_VOICE,
          responseFormat: 'mp3',
        },
      });

      const audioBuffer = Buffer.from(
        await new Response(audioStream).arrayBuffer()
      );

      if (audioBuffer.length === 0) {
        throw new Error('OpenRouter text-to-speech produced empty audio');
      }

      console.log(
        `[PronunciationService] Synthesized speech for text: "${text}" (size: ${audioBuffer.length} bytes)`
      );

      return audioBuffer;
    } catch (error) {
      console.error('Error synthesizing speech:', error);
      if (
        error instanceof Error &&
        error.message === 'OpenRouter text-to-speech produced empty audio'
      ) {
        throw error;
      }

      throw createOpenRouterSpeechError('Text-to-speech', error);
    }
  }
}

function getAudioFormat(mimeType: string) {
  if (mimeType.includes('webm')) return 'webm';
  if (mimeType.includes('mpeg') || mimeType.includes('mp3')) return 'mp3';
  if (mimeType.includes('mp4') || mimeType.includes('m4a')) return 'm4a';
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('aac')) return 'aac';
  return 'wav';
}

function createOpenRouterSpeechError(operation: string, error: unknown): Error {
  const details = error instanceof Error ? error.message : String(error);
  const statusCode =
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    typeof error.statusCode === 'number'
      ? ` (${error.statusCode})`
      : '';
  const providerMessage =
    typeof error === 'object' &&
    error !== null &&
    'body' in error &&
    typeof error.body === 'string' &&
    error.body
      ? `: ${error.body}`
      : `: ${details}`;

  return new Error(`${operation} failed${statusCode}${providerMessage}`);
}
