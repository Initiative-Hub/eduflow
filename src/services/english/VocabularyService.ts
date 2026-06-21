import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText, Output } from 'ai';
import * as z from 'zod';
import { DictionaryService } from '@/services/dictionary';
import { DEFAULT_MODELS } from '@/services/ai/chat-provider.constants';

const vocabularySchema = z.object({
  vocabulary: z.array(
    z.object({
      word: z
        .string()
        .describe(
          'A single English word in its BASE/LEMMA form — verbs as infinitive (run, not ran/running), nouns as singular (cat, not cats). Never output multi-word phrases.'
        ),
      partOfSpeech: z
        .string()
        .describe('Part of speech: noun, verb, adjective, adverb, etc.'),
      ipa: z
        .string()
        .nullable()
        .describe(
          'AI-generated IPA phonemic transcription wrapped in slashes, e.g. /ˈkɑːn.tɛkst/'
        ),
      englishDefinition: z
        .string()
        .describe('Concise English definition in simple terms'),
      vietnameseTranslation: z
        .string()
        .describe(
          'Detailed Vietnamese meaning for learners: one natural phrase or short sentence, not just a single-word gloss'
        ),
      exampleSentence: z
        .string()
        .describe('One short example sentence from the source text or similar'),
    })
  ),
  sentences: z
    .array(z.string())
    .describe('The source text split into individual sentences'),
});

export type VocabularyItem = {
  word: string;
  partOfSpeech: string;
  ipa: string | null;
  audioUrl: string | null;
  englishDefinition: string;
  vietnameseTranslation: string;
  exampleSentence: string;
};

export type AnalyzeResult = {
  vocabulary: VocabularyItem[];
  sentences: string[];
};

export class VocabularyService {
  /**
   * Extract key vocabulary from a text using AI, then enrich each word
   * with Merriam-Webster audio.
   */
  static async analyze(text: string, apiKey?: string): Promise<AnalyzeResult> {
    const key = apiKey ?? process.env.OPENROUTER_API_KEY;
    if (!key) throw new Error('Missing OpenRouter API key');

    const provider = createOpenRouter({ apiKey: key });

    const { output } = await generateText({
      model: provider(DEFAULT_MODELS.openrouter),
      output: Output.object({ schema: vocabularySchema }),
      system: `You are an English vocabulary tutor.
Analyze the given text and extract 8-12 key vocabulary words that are important for understanding the text.
Prefer words that are: advanced, academic, or contextually significant.
Avoid extracting very common words (the, is, a, in, etc.).

CRITICAL RULES for the 'word' field:
- Always use the BASE/LEMMA form: infinitive for verbs ("run" not "ran" or "running"), singular for nouns ("cat" not "cats"), base for adjectives.
- Output EXACTLY ONE single word — never a phrase, never two words.
- The base form must be dictionary-lookup compatible.
- Generate the ipa field yourself as a standard IPA phonemic transcription wrapped in slashes.
- Make vietnameseTranslation more helpful than a short gloss: include the core meaning and a little context in Vietnamese.

Split the text into sentence-sized chunks while preserving the learner's exact wording.
Do not correct grammar, spelling, capitalization, punctuation, or tense in the sentences field.`,
      prompt: `Extract key vocabulary from this English text:\n\n${text}`,
    });

    const sourceSentences = splitTextIntoSentences(text);

    // Enrich with Merriam-Webster audio in parallel (best-effort).
    const enriched = await Promise.all(
      output.vocabulary.map(async (item) => {
        const audioUrl = await VocabularyService.lookupMerriamWebsterAudio(
          item.word.toLowerCase()
        );

        return {
          ...item,
          exampleSentence: findSourceExampleSentence(item, sourceSentences),
          ipa: item.ipa ?? null,
          audioUrl,
        } satisfies VocabularyItem;
      })
    );

    return {
      vocabulary: enriched,
      sentences: sourceSentences,
    };
  }

  private static async lookupMerriamWebsterAudio(
    word: string
  ): Promise<string | null> {
    try {
      const learnersEntry = await DictionaryService.lookup(word, 'mw-learners');
      if (learnersEntry?.audioUrl) return learnersEntry.audioUrl;
    } catch {
      // Best-effort enrichment; keep the AI vocabulary row even without audio.
    }

    try {
      const collegiateEntry = await DictionaryService.lookup(
        word,
        'mw-collegiate'
      );
      return collegiateEntry?.audioUrl ?? null;
    } catch {
      return null;
    }
  }
}

function findSourceExampleSentence(
  item: { word: string; exampleSentence: string },
  sourceSentences: string[]
) {
  const example = item.exampleSentence.trim();
  if (sourceSentences.length === 0) return example;

  const normalizedExample = normalizeSearchText(example);
  const sentenceFromExample = sourceSentences.find(
    (sentence) =>
      normalizedExample &&
      normalizeSearchText(sentence).includes(normalizedExample)
  );
  if (sentenceFromExample) return sentenceFromExample;

  const wordPattern = new RegExp(
    `(^|[^\\p{L}\\p{N}_])${escapeRegExp(item.word.trim())}($|[^\\p{L}\\p{N}_])`,
    'iu'
  );

  return (
    sourceSentences.find((sentence) => wordPattern.test(sentence)) ?? example
  );
}

function normalizeSearchText(value: string) {
  return value.replace(/\s+/g, ' ').trim().toLowerCase();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function splitTextIntoSentences(text: string): string[] {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return [];

  const matches = normalized.match(/[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g);
  return (matches ?? [normalized])
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}
