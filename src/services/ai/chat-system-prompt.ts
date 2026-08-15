import { composeAiInstructions } from './ai-instructions';
import { GENERAL_AI_TOOL_SYSTEM_PROMPT } from './chat-provider.constants';

export function resolveChatSystemPrompt(
  specificSystemPrompt: string,
  customInstructions?: string | null
): string {
  return composeAiInstructions({
    generalInstructions: GENERAL_AI_TOOL_SYSTEM_PROMPT,
    featureInstructions: specificSystemPrompt,
    customInstructions,
  });
}
