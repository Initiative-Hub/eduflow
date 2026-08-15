export interface PronunciationAssessmentResult {
  transcript: string;
  targetText: string;
  score: number;
  matchedWords: string[];
  missingWords: string[];
  feedback: string;
}

export class PronunciationService {
  /**
   * Transcribe recorded audio buffer using OpenRouter / OpenAI Whisper model.
   */
  static async transcribeAudio(
    audioBuffer: Buffer,
    mimeType = 'audio/webm'
  ): Promise<string> {
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    const openAiKey = process.env.OPENAI_API_KEY;
    const apiKey = openRouterKey || openAiKey;

    if (!apiKey) {
      throw new Error(
        'Missing OPENROUTER_API_KEY or OPENAI_API_KEY for speech transcription'
      );
    }

    const isOpenRouter = Boolean(openRouterKey);
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
      w.toLowerCase().replace(/[^a-z0-9']/g, '').trim();

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
    else if (score >= 50) feedback = 'Good attempt! Try speaking a bit clearer.';

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
   * Synthesize text into ultra-natural human speech using OpenRouter GPT-Audio model (openai/gpt-audio-mini).
   */
  static async synthesizeSpeech(
    text: string,
    voice = 'nova'
  ): Promise<Buffer> {
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    const openAiKey = process.env.OPENAI_API_KEY;

    if (!openRouterKey && !openAiKey) {
      throw new Error(
        'Missing OPENROUTER_API_KEY or OPENAI_API_KEY for speech synthesis'
      );
    }

    if (openRouterKey) {
      const response = await fetch(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${openRouterKey}`,
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
        Authorization: `Bearer ${openAiKey}`,
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
