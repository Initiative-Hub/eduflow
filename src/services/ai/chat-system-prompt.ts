import { composeAiInstructions } from './ai-instructions';
import { GENERAL_AI_TOOL_SYSTEM_PROMPT } from './chat-provider.constants';

export function resolveChatSystemPrompt(
  specificSystemPrompt: string,
  customInstructions?: string | null
): string {
  const featureInstructions = [
    GENERAL_AI_TOOL_SYSTEM_PROMPT.trim(),
    specificSystemPrompt.trim(),
  ]
    .filter(Boolean)
    .join('\n\n');

  return composeAiInstructions({
    featureInstructions,
    customInstructions: customInstructions ?? undefined,
  });
}
