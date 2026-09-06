import { TranslateTextCommand } from '@aws-sdk/client-translate';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText } from 'ai';
import { createTranslateClient } from '@/lib/aws/translate-client';
import { DEFAULT_MODELS } from '@/services/ai/chat-provider.constants';

export type TranslationProvider = 'amazon' | 'mymemory' | 'ai';

export interface TranslationInput {
  text: string;
  from: string;
  to: string;
  provider: TranslationProvider;
  /** Optional API key for AI provider (falls back to env) */
  apiKey?: string;
}

export interface TranslationResult {
  translatedText: string;
  provider: TranslationProvider;
}

export class TranslationService {
  static async translate(input: TranslationInput): Promise<TranslationResult> {
    switch (input.provider) {
      case 'amazon':
        return TranslationService.translateWithAmazon(input);
      case 'mymemory':
        return TranslationService.translateWithMyMemory(input);
      case 'ai':
        return TranslationService.translateWithAI(input);
    }
  }

  /** Amazon Translate — neural MT, 2M chars/month free (12 months) */
  private static async translateWithAmazon(
    input: TranslationInput
  ): Promise<TranslationResult> {
    const client = createTranslateClient();
    const command = new TranslateTextCommand({
      Text: input.text,
      SourceLanguageCode: input.from,
      TargetLanguageCode: input.to,
    });

    const response = await client.send(command);
    const translatedText = response.TranslatedText ?? '';

    return { translatedText, provider: 'amazon' };
  }

  /**
   * MyMemory — free crowd-sourced MT.
   * Limit: 1K req/day (anon) or 10M chars/month (with MYMEMORY_EMAIL env var).
   */
  private static async translateWithMyMemory(
    input: TranslationInput
  ): Promise<TranslationResult> {
    const langpair = `${input.from}|${input.to}`;
    const email = process.env.MYMEMORY_EMAIL ?? '';
    const emailParam = email ? `&de=${encodeURIComponent(email)}` : '';

    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
      input.text
    )}&langpair=${langpair}${emailParam}`;

    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`MyMemory request failed: ${response.status}`);
    }

    const data = await response.json();
    const translatedText =
      data?.responseData?.translatedText ??
      data?.matches?.[0]?.translation ??
      '';

    return { translatedText, provider: 'mymemory' };
  }

  /**
   * AI translation via OpenRouter.
   * Context-aware, handles idioms well. Uses AI tokens.
   */
  private static async translateWithAI(
    input: TranslationInput
  ): Promise<TranslationResult> {
    const apiKey = input.apiKey ?? process.env.OPENROUTER_API_KEY;
    if (!apiKey)
      throw new Error('Missing OpenRouter API key for AI translation');

    const langMap: Record<string, string> = {
      en: 'English',
      vi: 'Vietnamese',
    };
    const fromLang = langMap[input.from] ?? input.from;
    const toLang = langMap[input.to] ?? input.to;

    const provider = createOpenRouter({ apiKey });
    try {
      const { text } = await generateText({
        model: provider(DEFAULT_MODELS.openrouter),
        instructions: `You are a professional translator. Translate the given text from ${fromLang} to ${toLang}. 
Output ONLY the translated text with no commentary, notes, or explanation.`,
        prompt: input.text,
      });

      return { translatedText: text.trim(), provider: 'ai' };
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      throw new Error(`AI translation failed: ${detail}`);
    }
  }
}
