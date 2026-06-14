import { openai } from '@ai-sdk/openai';
import { SynthesizeSpeechCommand, type VoiceId } from '@aws-sdk/client-polly';
import { experimental_generateSpeech as generateSpeech } from 'ai';
import { createPollyClient } from '@/lib/aws/polly-client';

export type PollyVoiceId = Extract<
  VoiceId,
  'Joanna' | 'Matthew' | 'Stephen' | 'Ruth'
>;
export type TTSProvider = 'openai' | 'polly';
export type OpenAITTSVoice =
  | 'alloy'
  | 'ash'
  | 'coral'
  | 'echo'
  | 'fable'
  | 'onyx'
  | 'nova'
  | 'sage'
  | 'shimmer';

export interface TTSInput {
  text: string;
  provider?: TTSProvider;
  voice?: OpenAITTSVoice;
  voiceId?: PollyVoiceId;
}

const DEFAULT_POLLY_VOICE: PollyVoiceId = 'Joanna';
const DEFAULT_OPENAI_VOICE: OpenAITTSVoice = 'alloy';

export class TTSService {
  /**
   * Synthesize English text to speech using OpenAI tts-1 by default.
   * Returns a Buffer containing the MP3 audio data.
   */
  static async synthesize(input: TTSInput): Promise<Buffer> {
    if (input.provider === 'polly') {
      return TTSService.synthesizeWithPolly(input);
    }

    return TTSService.synthesizeWithOpenAI(input);
  }

  /**
   * Synthesize speech using the AI SDK OpenAI provider and the tts-1 model.
   */
  static async synthesizeWithOpenAI(input: TTSInput): Promise<Buffer> {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('Missing OpenAI API key for TTS');
    }

    const result = await generateSpeech({
      model: openai.speech('tts-1'),
      text: input.text,
      voice: input.voice ?? DEFAULT_OPENAI_VOICE,
      outputFormat: 'mp3',
      language: 'en',
    });

    return Buffer.from(result.audio.uint8Array);
  }

  /**
   * Legacy Amazon Polly path kept available for fallback or explicit use.
   *
   * Voices: Joanna (female, Neural), Matthew (male, Neural),
   *         Ruth (female, Neural), Stephen (male, Generative)
   */
  static async synthesizeWithPolly(input: TTSInput): Promise<Buffer> {
    const client = createPollyClient();
    const voiceId = (input.voiceId ?? DEFAULT_POLLY_VOICE) as VoiceId;

    // Use generative engine for Stephen, neural for the rest
    const engine = voiceId === 'Stephen' ? 'generative' : 'neural';

    const command = new SynthesizeSpeechCommand({
      Text: input.text,
      OutputFormat: 'mp3',
      VoiceId: voiceId,
      Engine: engine,
      LanguageCode: 'en-US',
    });

    const response = await client.send(command);

    if (!response.AudioStream) {
      throw new Error('Polly returned no audio stream');
    }

    const chunks: Uint8Array[] = [];
    for await (const chunk of response.AudioStream as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }

    return Buffer.concat(chunks);
  }
}
