import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText, Output } from 'ai';
import * as z from 'zod';
import { DEFAULT_MODELS } from '@/services/ai/chat-provider.constants';

const grammarIssueSchema = z.object({
  type: z.enum(['grammar', 'spelling', 'style', 'punctuation']),
  original: z.string().describe('The problematic word or phrase'),
  suggestion: z.string().describe('The corrected version'),
  description: z.string().describe('Brief explanation of the issue'),
});

const structuralMapSchema = z.object({
  text: z.string().describe('Exact word or phrase from the analyzed sentence'),
  role: z
    .string()
    .describe('Grammar role, e.g. Subject, Verb, Object, Modifier, Clause'),
  explanation: z
    .string()
    .describe('Simple explanation of how this word or phrase works'),
});

const styleVariationSchema = z.object({
  label: z.string().describe('Short label, e.g. More casual or More concise'),
  sentence: z.string().describe('A natural alternative way to say it'),
});

const grammarAnalysisSchema = z.object({
  hasErrors: z
    .boolean()
    .describe('Whether any grammar/spelling issues were found'),
  correctedSentence: z
    .string()
    .optional()
    .describe('The fully corrected sentence, if there were errors'),
  grammarStructure: z
    .string()
    .describe(
      'Simple label for the sentence structure, e.g. "Subject + Verb + Object"'
    ),
  tense: z
    .string()
    .describe('The primary tense used, e.g. "Simple Present", "Past Perfect"'),
  issues: z.array(grammarIssueSchema).describe('List of specific issues found'),
  structuralMap: z
    .array(structuralMapSchema)
    .default([])
    .describe('Direct word-or-phrase to grammar-role mapping'),
  tenseExplanation: z
    .string()
    .default('')
    .describe('Why the tense is appropriate in this sentence'),
  strengths: z
    .array(z.string())
    .default([])
    .describe('Specific vocabulary, collocation, or clarity strengths'),
  styleVariations: z
    .array(styleVariationSchema)
    .default([])
    .describe('Natural alternatives when the sentence is already correct'),
  explanation: z
    .string()
    .describe(
      'A short, encouraging explanation suitable for an English learner'
    ),
});

export type GrammarAnalysis = z.infer<typeof grammarAnalysisSchema>;

export class GrammarService {
  /**
   * Analyze a single English sentence for grammar, spelling, and style issues.
   * Returns structured feedback suitable for language learners.
   */
  static async analyze(
    sentence: string,
    apiKey?: string
  ): Promise<GrammarAnalysis> {
    const key = apiKey ?? process.env.OPENROUTER_API_KEY;
    if (!key) throw new Error('Missing OpenRouter API key');

    const provider = createOpenRouter({ apiKey: key });

    const { output } = await generateText({
      model: provider(DEFAULT_MODELS.openrouter),
      output: Output.object({ schema: grammarAnalysisSchema }),
      instructions: `You are a friendly English grammar teacher helping ESL/EFL students.
Analyze the given sentence for grammar, spelling, punctuation, and style issues.
Be encouraging and constructive. Keep explanations simple and clear.
Never rewrite the learner's sentence as the analyzed sentence. Treat the prompt sentence as immutable learner input.
If it is ungrammatical, set hasErrors to true, keep original/problematic text in issues.original, and put corrected wording only in issues.suggestion or correctedSentence.
For every sentence, map grammar roles directly to the exact words or phrases the learner wrote.
Use lowercase grammar role labels in structuralMap.role, for example "subject", "verb", "object", "modifier", "clause".
Explain why the tense is appropriate in context, not just the tense name.
If the sentence is correct, turn the success state into exploration:
- Point out precise strengths in vocabulary, collocation, clarity, or flow.
- Include "Ways to say this" style variations that are natural and useful.
If there are errors, keep feedback actionable with original text, correction, and the rule behind it.`,
      prompt: `Analyze this English sentence:\n\n"${sentence}"`,
    });

    return {
      ...output,
      structuralMap: output.structuralMap.map((part) => ({
        ...part,
        role: part.role.toLowerCase(),
      })),
    };
  }
}
