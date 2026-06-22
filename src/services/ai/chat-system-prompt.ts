import { GENERAL_AI_TOOL_SYSTEM_PROMPT } from './chat-provider.constants';

export function resolveChatSystemPrompt(specificSystemPrompt: string): string {
  const specificPrompt = specificSystemPrompt.trim();
  const generalPrompt = GENERAL_AI_TOOL_SYSTEM_PROMPT.trim();

  return specificPrompt
    ? `${specificPrompt}\n\n${generalPrompt}`
    : generalPrompt;
}
