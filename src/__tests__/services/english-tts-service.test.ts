import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockSpeechModel = { provider: 'openai', modelId: 'tts-1' };
const openaiSpeech = vi.hoisted(() => vi.fn(() => mockSpeechModel));
const generateSpeech = vi.hoisted(() =>
  vi.fn(async () => ({
    audio: {
      uint8Array: new Uint8Array([1, 2, 3]),
      mediaType: 'audio/mpeg',
      format: 'mp3',
      base64: '',
    },
    warnings: [],
    responses: [],
    providerMetadata: {},
  }))
);
const pollySend = vi.hoisted(() => vi.fn());

vi.mock('@ai-sdk/openai', () => ({
  openai: {
    speech: openaiSpeech,
  },
}));

vi.mock('ai', async (importOriginal) => ({
  ...(await importOriginal<typeof import('ai')>()),
  experimental_generateSpeech: generateSpeech,
}));

vi.mock('@/lib/aws/polly-client', () => ({
  createPollyClient: () => ({ send: pollySend }),
}));

describe('TTSService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = 'test-openai-key';
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  it('uses OpenAI tts-1 through AI SDK for the default synthesis path', async () => {
    const { TTSService } = await import('@/services/english/TTSService');

    const audio = await TTSService.synthesize({ text: 'Hello there.' });

    expect(openaiSpeech).toHaveBeenCalledWith('tts-1');
    expect(generateSpeech).toHaveBeenCalledWith(
      expect.objectContaining({
        model: mockSpeechModel,
        text: 'Hello there.',
        voice: 'alloy',
        outputFormat: 'mp3',
        language: 'en',
      })
    );
    expect(pollySend).not.toHaveBeenCalled();
    expect(audio).toEqual(Buffer.from([1, 2, 3]));
  });

  it('fails with a clear configuration message when the OpenAI API key is missing', async () => {
    delete process.env.OPENAI_API_KEY;

    const { TTSService } = await import('@/services/english/TTSService');

    await expect(
      TTSService.synthesize({ text: 'Hello there.' })
    ).rejects.toThrow('Missing OpenAI API key for TTS');
    expect(generateSpeech).not.toHaveBeenCalled();
  });
});
