import { google } from '@ai-sdk/google';
import type { UIMessage } from 'ai';
import { convertToModelMessages, streamText } from 'ai';

const SYSTEM_PROMPT =
  'You are a scholarly assistant named EduFlow AI. Provide well-reasoned, academic, and structured responses to help students and researchers in their inquiry. Be professional yet encouraging.';

export class AIService {
  /**
   * Validates that the required API key is present.
   * @throws Error if the key is missing.
   */
  static assertApiKey(): void {
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      throw new Error(
        'Missing GOOGLE_GENERATIVE_AI_API_KEY in environment variables.'
      );
    }
  }

  static async streamChat(messages: UIMessage[]) {
    AIService.assertApiKey();

    return streamText({
      model: google('gemini-2.5-flash'),
      system: SYSTEM_PROMPT,
      messages: await convertToModelMessages(messages),
    });
  }
}
