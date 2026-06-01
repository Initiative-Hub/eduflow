import { SYSTEM_PROMPT } from './chat-provider.constants';
import type { StreamChatInternalOptions } from './chat-provider.types';

export function resolveChatSystemPrompt(
  options?: StreamChatInternalOptions
): string {
  if (!options?.prompt) return SYSTEM_PROMPT;
  if (options.mode === 'replace') return options.prompt;

  return `${SYSTEM_PROMPT}\n\n=== ADDITIONAL CONTEXT ===\n${options.prompt}`;
}
