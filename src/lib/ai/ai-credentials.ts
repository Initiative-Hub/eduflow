/**
 * Helper utilities for resolving AI credentials (OpenRouter, OpenAI, Google)
 * across application services and API routes.
 */

export interface AICredentials {
  apiKey: string;
  provider: 'openrouter' | 'openai' | 'google';
}

/**
 * Resolve the API key for speech services (transcription, assessment, TTS).
 * Prefers explicit overrideKey, then OPENROUTER_API_KEY, then OPENAI_API_KEY.
 */
export function getSpeechApiKey(overrideKey?: string): AICredentials {
  const apiKey =
    overrideKey ||
    process.env.OPENROUTER_API_KEY ||
    process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      'Missing OPENROUTER_API_KEY or OPENAI_API_KEY for speech services'
    );
  }

  const provider = overrideKey
    ? 'openrouter'
    : process.env.OPENROUTER_API_KEY
      ? 'openrouter'
      : 'openai';

  return { apiKey, provider };
}

/**
 * Resolve OpenRouter API key or throw an explicit error.
 */
export function getOpenRouterApiKey(overrideKey?: string): string {
  const apiKey = overrideKey || process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('Missing OPENROUTER_API_KEY environment variable');
  }
  return apiKey;
}
