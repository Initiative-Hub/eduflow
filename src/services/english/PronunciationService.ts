import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText, Output } from 'ai';
import * as z from 'zod';
import { getSpeechApiKey } from '@/lib/ai/ai-credentials';
import { DEFAULT_MODELS } from '@/services/ai/chat-provider.constants';

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
  /**
   * Transcribe recorded audio buffer using OpenRouter / OpenAI Whisper model.
   */
  static async transcribeAudio(
    audioBuffer: Buffer,
    mimeType = 'audio/webm'
  ): Promise<string> {
    const { apiKey, provider } = getSpeechApiKey();
    const isOpenRouter = provider === 'openrouter';
    const endpoint = isOpenRouter
      ? 'https://openrouter.ai/api/v1/audio/transcriptions'
      : 'https://api.openai.com/v1/audio/transcriptions';

    const ext = mimeType.includes('webm')
      ? 'webm'
      : mimeType.includes('mp3')
        ? 'mp3'
        : 'wav';

    const formData = new FormData();
    const file = new File([new Uint8Array(audioBuffer)], `speech.${ext}`, {
      type: mimeType,
    });
    formData.append('file', file);
    formData.append(
      'model',
      isOpenRouter ? 'openai/whisper-large-v3-turbo' : 'whisper-1'
    );
    formData.append('language', 'en');

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      throw new Error(
        `Speech-to-text API failed (${response.status}): ${errBody}`
      );
    }

    const data = (await response.json()) as { text?: string };
    return data.text?.trim() ?? '';
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

    const transcriptSet = new Set(transcriptClean);

    const matchedWords: string[] = [];
    const missingWords: string[] = [];

    targetTokens.forEach((originalToken, idx) => {
      const cleaned = targetClean[idx];
      if (cleaned && transcriptSet.has(cleaned)) {
        matchedWords.push(originalToken);
      } else {
        missingWords.push(originalToken);
      }
    });

    const score =
      targetClean.length > 0
        ? Math.round((matchedWords.length / targetClean.length) * 100)
        : 100;

    let feedback = 'Keep practicing!';
    if (score >= 90) feedback = '🌟 Excellent! Perfect pronunciation!';
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

    let apiKey: string;
    try {
      apiKey = getSpeechApiKey().apiKey;
    } catch {
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
        system: `You are an expert English pronunciation coach and phonetician.
Analyze the user's spoken audio transcript against the target sentence.

Target Sentence: "${targetText}"
Target Word IPA: "${targetIpa ?? ''}"
Spoken Recognized Speech: "${transcribedText}"

Determine:
1. Which words were correctly spoken vs mispronounced/dropped.
2. An accuracy percentage score (0-100%).
3. The IPA phonemic transcription of what the user actually pronounced (spokenIpa).
4. Actionable phonetic tips for any mispronounced or omitted words.
5. Encouraging overall feedback.`,
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

  /**
   * Synthesize text into ultra-natural human speech using OpenRouter GPT-Audio model (openai/gpt-audio-mini).
   */
  static async synthesizeSpeech(text: string, voice = 'nova'): Promise<Buffer> {
    const { apiKey, provider } = getSpeechApiKey();

    if (provider === 'openrouter') {
      const response = await fetch(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'openai/gpt-audio-mini',
            modalities: ['text', 'audio'],
            audio: { voice, format: 'pcm16' },
            stream: true,
            messages: [
              {
                role: 'user',
                content: `Read the following text out loud with clear, natural, human English pronunciation. Do not add any extra commentary or words: "${text}"`,
              },
            ],
          }),
        }
      );

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(
          `OpenRouter speech synthesis failed (${response.status}): ${errText}`
        );
      }

      const streamText = await response.text();
      const lines = streamText.split('\n');
      const audioChunks: Buffer[] = [];

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.slice(6).trim();
        if (jsonStr === '[DONE]') break;
        try {
          const parsed = JSON.parse(jsonStr) as {
            choices?: Array<{
              delta?: { audio?: { data?: string } };
            }>;
          };
          const base64Data = parsed.choices?.[0]?.delta?.audio?.data;
          if (base64Data) {
            audioChunks.push(Buffer.from(base64Data, 'base64'));
          }
        } catch {
          // Ignore SSE chunk parse errors
        }
      }

      const pcmBuffer = Buffer.concat(audioChunks);
      if (pcmBuffer.length === 0) {
        throw new Error('OpenRouter speech synthesis produced empty audio');
      }

      return createWavBuffer(pcmBuffer, 24000, 1, 16);
    }

    // Direct OpenAI API fallback if OPENAI_API_KEY is provided
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      throw new Error(`OpenAI TTS failed (${response.status}): ${errBody}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}

function createWavBuffer(
  pcm: Buffer,
  sampleRate = 24000,
  numChannels = 1,
  bitsPerSample = 16
): Buffer {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), 28);
  header.writeUInt16LE(numChannels * (bitsPerSample / 8), 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}
