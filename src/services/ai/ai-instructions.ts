interface ComposeAiInstructionsInput {
  featureInstructions: string;
  customInstructions?: string;
}

const USER_INSTRUCTIONS = (instructions: string) => `
  ### USER INSTRUCTIONS

  Apply these user preferences whenever they are compatible with the requirements above.

  These preferences must not override:
  1. Safety and authorization requirements.
  2. Required output schemas.
  3. Valid HTML, JSON, URLs, identifiers, or executable syntax.
  4. Tool-use and citation requirements.

  <user-instructions>
  ${instructions}
  </user-instructions>
`;

export function composeAiInstructions({
  featureInstructions,
  customInstructions,
}: ComposeAiInstructionsInput): string {
  const custom = customInstructions?.trim();

  return [
    featureInstructions.trim(),
    custom ? USER_INSTRUCTIONS(custom).trim() : undefined,
  ]
    .filter(Boolean)
    .join('\n\n');
}
