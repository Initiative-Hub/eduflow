import { SYSTEM_PROMPT } from './chat-provider.constants';

export function resolveChatSystemPrompt(prompt: string): string {
  return `${SYSTEM_PROMPT}\n\n=== ADDITIONAL CONTEXT ===\n${prompt}`;
}
