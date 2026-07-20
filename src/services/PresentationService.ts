import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText, Output } from 'ai';
import * as z from 'zod';
import { DEFAULT_MODELS } from '@/services/ai/chat-provider.constants';
import { LessonService } from '@/services/LessonService';

const STANDARD_LAYOUT_TYPES = [
  'TITLE_SLIDE',
  'AGENDA_OUTLINE',
  'SECTION_HEADER',
  'TITLE_BULLETS',
  'TWO_COLUMN_SPLIT',
  'BIG_QUOTE_TAKEAWAY',
  'KPI_BIG_NUMBER',
  'CHART_INSIGHT',
  'DATA_TABLE',
  'MEDIA_TEXT',
  'TIMELINE_MILESTONES',
  'STEP_BY_STEP',
  'CONCLUSION_SUMMARY',
  'CALL_TO_ACTION',
  'QA_CONTACT',
  'REFERENCES_LIST',
  'STATEMENT_IMAGE',
  'PYRAMID_LEVELS',
  'FUNNEL_STAGES',
  'PROCESS_ARROWS',
  'CIRCLE_CYCLE',
] as const;

/**
 * Built-in style collections the planner may recommend based on the lesson's
 * subject and tone. Must match folder names under external-services/templates.
 */
const STYLE_COLLECTIONS: Record<string, string> = {
  starter: 'Neutral, professional default — safe for any subject or audience.',
  neon_dark:
    'Dark background with vivid cyan/pink neon accents — tech, coding, gaming, modern engineering topics.',
  vintage:
    'Aged cream paper, rust red and sage green, classic serif type — history, literature, arts, humanities, traditional culture.',
  clean_light:
    'White, minimal, one strong blue accent — business, science, data-heavy analysis, policy briefings, or formal report material.',
  pastel_pop:
    'Soft blush background, rose pink and mint accents, friendly rounded feel — younger audiences, wellbeing, creative or community topics.',
  illustrative_culture:
    'Warm cream background, hand-drawn vector buildings & clouds, Yogyakarta street aesthetic, sage green, sky blue, and gold accents — culture, art, architecture, geography, and storytelling.',
  minimalist_gradient:
    'Sleek dark theme with electric royal blue and violet gradient glows, crisp modern typography, and ambient grid lines — technology, start-ups, product design, business pitches, and modern tech topics.',
  organic_streets:
    'Cream paper, deep plum script headlines, golden sun discs, slate and terracotta organic blobs, line-art European street skylines — travel, geography, history, literature, art and storytelling topics.',
  cultural_folk:
    'Warm plum-gray background, cream text, terracotta and sand accents with a grounded earth strip — culture, diversity, social studies, community, humanities and storytelling topics.',
  electric_green_white:
    'Clean white editorial canvas with black contrast, electric green accents, modern automotive framing, and bold geometric type — electric vehicles, sustainability, engineering, product showcases, and transportation topics.',
  green_environment_care:
    'Cream paper, deep forest-green condensed headlines, lush nature photography, sage botanical ornaments, and subtle halftone texture — conservation, climate, ecology, sustainability, biodiversity, and environmental care topics.',
  rmit_red_modern:
    'Crisp white academic canvas with bold RMIT-red geometric frames, subtle contour-line texture, black sans-serif typography, and red-washed campus image panels — university lectures, student learning topics, course briefings, research presentations, feedback analysis, and academic project decks.',
  startup_neon_pitch:
    'Black startup pitch deck with oversized white typography, electric blue and violet light trails, glossy gradient pills, and contact-footer details — startup pitches, business proposals, tech products, investor decks, and modern company presentations.',
};

type TemplateCategoryMetadata = {
  description?: string;
  when_to_use?: string;
  prompt_hint?: string;
  content_guidance?: string[];
};

type TemplateCategoryMetadataMap = Record<string, TemplateCategoryMetadata>;

const slideBindingsSchema = z.object({
  subtitle: z.string().optional(),
  author: z.string().optional(),
  sub_module_name: z.string().optional(),
  bullets: z.array(z.string()).optional(),
  items: z.array(z.string()).optional(),
  steps: z.array(z.string()).optional(),
  summary_points: z.array(z.string()).optional(),
  action_items: z.array(z.string()).optional(),
  left_col_title: z.string().optional(),
  left_col_text: z.array(z.string()).optional(),
  right_col_title: z.string().optional(),
  right_col_text: z.array(z.string()).optional(),
  quote: z.string().optional(),
  author_or_source: z.string().optional(),
  metrics: z
    .array(
      z.object({
        value: z.string(),
        label: z.string(),
      })
    )
    .optional(),
  chart_type: z.enum(['bar', 'line', 'pie']).optional(),
  chart_data: z
    .array(
      z.object({
        label: z.string(),
        value: z.number(),
        display_value: z.string().optional(),
      })
    )
    .optional(),
  insight_text: z.string().optional(),
  headers: z.array(z.string()).optional(),
  rows: z.array(z.array(z.string())).optional(),
  image_prompt_description: z.string().optional(),
  body_text: z.string().optional(),
  statement: z.string().optional(),
  events: z
    .array(
      z.object({
        date_or_step: z.string(),
        description: z.string(),
      })
    )
    .optional(),
  sources: z
    .array(
      z.object({
        title: z.string(),
        url: z.string(),
        summary: z.string().optional(),
      })
    )
    .optional(),
  levels: z
    .array(
      z.object({
        title: z.string(),
        description: z.string(),
      })
    )
    .optional(),
  stages: z
    .array(
      z.object({
        title: z.string(),
        description: z.string(),
      })
    )
    .optional(),
  process_steps: z
    .array(
      z.object({
        title: z.string(),
        description: z.string(),
      })
    )
    .optional(),
  phases: z
    .array(
      z.object({
        title: z.string(),
        description: z.string(),
      })
    )
    .optional(),
  footer_note: z.string().optional(),
});

export const presentationPlanSchema = z.object({
  slides: z.array(
    z.object({
      layoutType: z.string(),
      slideTitle: z.string(),
      bindings: slideBindingsSchema,
    })
  ),
  // Style collection the AI judged best-fitting for the lesson (optional).
  recommendedCollection: z.string().optional(),
});

export type PresentationPlan = z.infer<typeof presentationPlanSchema>;

type ResolveRecommendedCollectionOptions = {
  recommendedCollection?: string;
  lessonTitle: string;
  lessonContent: unknown;
  context?: string;
  styleCollections?: Record<string, string>;
};

const PLANNER_SYSTEM_PROMPT =
  'You are a senior instructional designer and keynote presentation architect. ' +
  'You turn raw lesson material into polished, presentation-ready slide decks: ' +
  'you pick the single best layout for each idea, extract the concrete facts ' +
  '(numbers, names, dates, comparisons, quotes) from the source, and write ' +
  'complete, audience-facing copy — never placeholders, never generic filler.';

const STYLE_REQUEST_TOKENS = new Set([
  'apply',
  'choose',
  'chon',
  'dung',
  'pick',
  'prefer',
  'select',
  'style',
  'template',
  'theme',
  'use',
  'using',
]);

const STYLE_COLLECTION_ALIASES: Partial<
  Record<keyof typeof STYLE_COLLECTIONS, readonly string[]>
> = {
  clean_light: ['clean light'],
  cultural_folk: ['cultural folk'],
  electric_green_white: ['electric green white'],
  green_environment_care: ['green environment care'],
  illustrative_culture: ['illustrative culture'],
  minimalist_gradient: ['minimalist gradient'],
  organic_streets: ['organic streets'],
  pastel_pop: ['pastel pop'],
  rmit_red_modern: ['rmit', 'rmit red modern'],
  startup_neon_pitch: ['startup neon pitch'],
};

export function getAvailableStyleCollections(
  styleCollections?: Record<string, string>
): Record<string, string> {
  if (!styleCollections || Object.keys(styleCollections).length === 0) {
    return { ...STYLE_COLLECTIONS };
  }

  return {
    ...STYLE_COLLECTIONS,
    ...styleCollections,
  };
}

function normalizeRecommendationText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

function normalizeStyleReference(value: string): string {
  return normalizeRecommendationText(value)
    .replace(/[_-]+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasMatchingTokenSequence(
  tokens: string[],
  aliasTokens: string[],
  startIndex: number
): boolean {
  return aliasTokens.every(
    (token, offset) => tokens[startIndex + offset] === token
  );
}

function hasStyleRequestSignalNearby(
  tokens: string[],
  startIndex: number,
  aliasLength: number
): boolean {
  const windowStart = Math.max(0, startIndex - 3);
  const windowEnd = Math.min(tokens.length, startIndex + aliasLength + 3);

  return tokens
    .slice(windowStart, windowEnd)
    .some((token) => STYLE_REQUEST_TOKENS.has(token));
}

function buildStyleAliases(collectionName: string): string[] {
  const additionalAliases =
    STYLE_COLLECTION_ALIASES[
      collectionName as keyof typeof STYLE_COLLECTION_ALIASES
    ] ?? [];

  return [
    ...new Set(
      [collectionName, ...additionalAliases]
        .map(normalizeStyleReference)
        .filter(Boolean)
    ),
  ];
}

function findExplicitStyleRequest(
  context: string | undefined,
  knownStyles: Record<string, string>
): string | undefined {
  if (!context) {
    return undefined;
  }

  const normalizedContext = normalizeStyleReference(context);
  const contextTokens = normalizedContext.split(' ');

  for (const collectionName of Object.keys(knownStyles)) {
    const aliases = buildStyleAliases(collectionName);

    for (const alias of aliases) {
      if (normalizedContext === alias) {
        return collectionName;
      }

      const aliasTokens = alias.split(' ');

      for (
        let index = 0;
        index <= contextTokens.length - aliasTokens.length;
        index += 1
      ) {
        if (
          hasMatchingTokenSequence(contextTokens, aliasTokens, index) &&
          hasStyleRequestSignalNearby(contextTokens, index, aliasTokens.length)
        ) {
          return collectionName;
        }
      }
    }
  }

  return undefined;
}

export function resolveRecommendedCollection(
  options: ResolveRecommendedCollectionOptions
): string | undefined {
  const knownStyles = getAvailableStyleCollections(options.styleCollections);
  const recommendedCollection =
    options.recommendedCollection &&
    options.recommendedCollection in knownStyles
      ? options.recommendedCollection
      : undefined;

  const combined = normalizeRecommendationText(
    [options.lessonTitle, String(options.lessonContent || ''), options.context]
      .filter(Boolean)
      .join(' ')
  );

  const explicitlyRequestedCollection = findExplicitStyleRequest(
    options.context,
    knownStyles
  );

  if (explicitlyRequestedCollection) {
    return explicitlyRequestedCollection;
  }

  const academicSignals = [
    /\bdai hoc\b|\buniversity\b|\bcampus\b/,
    /\bhoc thuat\b|\bacademic\b|\bresearch\b|\bnghien cuu\b/,
    /\bsinh vien\b|\bstudent\b|\bcourse\b|\blecture\b|\bfeedback\b/,
  ];
  const academicScore = academicSignals.reduce(
    (count, pattern) => count + (pattern.test(combined) ? 1 : 0),
    0
  );

  if (
    academicScore >= 2 &&
    'rmit_red_modern' in knownStyles &&
    (!recommendedCollection ||
      recommendedCollection === 'clean_light' ||
      recommendedCollection === 'starter')
  ) {
    return 'rmit_red_modern';
  }

  return recommendedCollection;
}

export class PresentationService {
  private static getCategoryGuidance(
    category: string,
    metadata?: TemplateCategoryMetadataMap
  ): TemplateCategoryMetadata | undefined {
    return metadata?.[category];
  }

  private static buildCategoryGuidanceBlock(
    categories: readonly string[] | string[],
    metadata?: TemplateCategoryMetadataMap
  ): string {
    return categories
      .map((category) => {
        const guidance = PresentationService.getCategoryGuidance(
          category,
          metadata
        );

        if (guidance?.prompt_hint) {
          return `- '${category}': ${guidance.prompt_hint}`;
        }

        const fallbackBits = [guidance?.description, guidance?.when_to_use]
          .filter(Boolean)
          .join(' ');

        return fallbackBits
          ? `- '${category}': ${fallbackBits}`
          : `- '${category}': Use the category name literally and fill it with real lesson content from the lesson.`;
      })
      .join('\n');
  }

  /** Maps a presentation duration (in minutes) to a target slide count. */
  private static getTargetSlideCount(duration: string): number {
    switch (duration) {
      case '5':
        return 3;
      case '10':
        return 4;
      case '15':
        return 5;
      case '30':
        return 8;
      case '45':
        return 10;
      case '60':
        return 12;
      case '90':
        return 16;
      case '120':
        return 20;
      default:
        return 5;
    }
  }

  /** Normalizes lesson content (Tiptap JSON or string) into a prompt snippet. */
  private static buildContentSnippet(lessonContent: unknown): string {
    const raw =
      typeof lessonContent === 'object'
        ? JSON.stringify(lessonContent)
        : String(lessonContent || '');
    return raw.slice(0, 16000);
  }

  /**
   * Builds the master planning prompt. The instructions push the model toward
   * a rich, varied, fully-compiled deck rather than a list of bullet slides.
   */
  private static buildMasterPrompt(opts: {
    lessonTitle: string;
    contentSnippet: string;
    targetSlideCount: number;
    context?: string;
    standardCategoryMetadata?: TemplateCategoryMetadataMap;
    styleCollections?: Record<string, string>;
  }): string {
    const { lessonTitle, contentSnippet, targetSlideCount, context } = opts;
    const isShortDeck = targetSlideCount <= 5;
    const isCompactDeck = targetSlideCount > 5 && targetSlideCount <= 8;
    // live inventory (local + S3) when available; built-in list otherwise
    const styles = getAvailableStyleCollections(opts.styleCollections);

    const structureBlock = isShortDeck
      ? `NARRATIVE & STRUCTURE
- Build a concise, presenter-ready mini deck:
  1. Slide 1 MUST be 'TITLE_SLIDE'.
  2. Slide 2 MUST be 'AGENDA_OUTLINE' with ONLY 1 to 2 main parts that the remaining slides will actually cover.
  3. Use the remaining slides for the most important 1 to 2 concepts from the lesson, then close with either 'CONCLUSION_SUMMARY' or a final closing slide ('QA_CONTACT', 'CALL_TO_ACTION', or 'REFERENCES_LIST').
  4. For decks this short, 'SECTION_HEADER' is OPTIONAL and should only be used if it still leaves room for substantive content.
- HARD RULE: Do NOT list more agenda topics than the deck has room to explain. Every agenda item must clearly map to at least one later slide.`
      : isCompactDeck
        ? `NARRATIVE & STRUCTURE
- Build a compact but coherent story arc:
  1. Slide 1 MUST be 'TITLE_SLIDE'.
  2. Slide 2 MUST be 'AGENDA_OUTLINE' summarizing ONLY 2 to 3 topics that will actually be covered later.
  3. Divide the presentation into 2 to 3 logical sections/sub-topics based on the lesson contents.
  4. 'SECTION_HEADER' slides are recommended, but may be skipped if space is tight and the content slides remain clearly grouped by topic.
  5. End with a wrap-up sequence using 'CONCLUSION_SUMMARY' and/or one final closing slide.
- HARD RULE: Every agenda item must clearly map to later slides in the deck.`
        : `NARRATIVE & STRUCTURE
- Build a coherent story arc following a standard corporate/educational slide deck structure:
  1. Slide 1 MUST be 'TITLE_SLIDE'.
  2. Slide 2 MUST be 'AGENDA_OUTLINE' summarizing the main topics covered in the deck.
  3. Divide the presentation into 2 to 4 logical sections/sub-topics based on the lesson contents.
  4. Introduce each section using a 'SECTION_HEADER' slide (a big title divider slide).
  5. Follow each 'SECTION_HEADER' with 2 to 4 detailed content slides (like 'TWO_COLUMN_SPLIT', 'TITLE_BULLETS', 'STEP_BY_STEP', 'KPI_BIG_NUMBER', 'TIMELINE_MILESTONES', 'STATEMENT_IMAGE', etc.) explaining the concepts in that section.
  6. End the presentation with a wrap-up sequence: a 'CONCLUSION_SUMMARY' slide of key takeaways, and a final closing slide ('QA_CONTACT', 'CALL_TO_ACTION', or 'REFERENCES_LIST').
- STRICT STRUCTURE ENFORCEMENT: The slide sequence MUST strictly alternate as:
  \`[TITLE_SLIDE] -> [AGENDA_OUTLINE] -> [SECTION_HEADER (Topic A)] -> [2–4 Content Slides (Topic A)] -> [SECTION_HEADER (Topic B)] -> [2–4 Content Slides (Topic B)] -> ... -> [CONCLUSION_SUMMARY] -> [Final Closing Slide]\`
  NEVER put two 'SECTION_HEADER' slides consecutively.
  NEVER skip 'SECTION_HEADER' dividers for long decks (>6 slides).`;

    return `
You are compiling a complete, professional slide deck from the lesson below. Treat the lesson as the single source of truth and turn it into a deck a presenter could deliver as-is.

Lesson Title: "${lessonTitle}"
Core Lesson Content:
${contentSnippet}

Target Slide Count: EXACTLY ${targetSlideCount} slides.
${
  context
    ? `\nUser Custom Guidelines / Specific Request:\n"${context}"\nYou MUST weave these instructions into the structure, layout choices, focus topics, tone, and the copy on every slide.\n`
    : ''
}
${structureBlock}
- STRICT VARIETY CONSTRAINT: For decks >5 slides, you MUST use at least 4 distinct layoutTypes. NEVER use the same layoutType for more than 2 slides in a row. Forbid layout monotony; distribute concepts across list slides, diagram layouts (PYRAMID_LEVELS, FUNNEL_STAGES, PROCESS_ARROWS, CIRCLE_CYCLE), comparisons (TWO_COLUMN_SPLIT), and text/media splits.
- UNIQUE HEADLINES: EVERY slideTitle must be a highly descriptive, unique, content-specific headline summarizing that slide's specific concept (e.g. "T-Test Formula Requirements", "Practical P-Value Interpretation"). NEVER use repetitive, generic sequential titles like "Concept Expansion 1", "Concept Expansion 2", etc.
CHOOSE THE BEST LAYOUT FOR EACH IDEA (do not default everything to TITLE_BULLETS — aim for variety):
${PresentationService.buildCategoryGuidanceBlock(STANDARD_LAYOUT_TYPES, opts.standardCategoryMetadata)}

CONTENT DEPTH (this is what "detailed" means):
- Extract the SPECIFICS from the lesson: real figures, names, dates, examples, and comparisons. If the lesson says "2.4 billion USD market, 18M students, 32% growth", surface those exact numbers on a KPI/CHART slide.
- Write complete, self-contained sentences and labels — copy that reads well on screen. No "TODO", no "Lorem ipsum", no "etc.", no empty fields.
- On number-heavy slides, do not leave bare numerals without context. Use labels, ranges, scales, units, compact 'display_value' badges, and 'insight_text' to explain what the numbers mean.
- Give each slide enough substance to fill it (see the per-layout counts above), but keep bullets tight and scannable.
- Every slideTitle must be a specific, descriptive headline (e.g. "Market by the Numbers"), not a generic label like "Slide 4".
- Match the lesson's language (e.g. write the deck in Vietnamese if the lesson is in Vietnamese).

Layout Binding Specifications (use these EXACT keys in each slide's 'bindings' object):
- 'TITLE_SLIDE': { "subtitle": string, "author": string }
- 'AGENDA_OUTLINE': { "items": string[] }
- 'SECTION_HEADER': { "sub_module_name": string }
- 'TITLE_BULLETS': { "bullets": string[] }
- 'TWO_COLUMN_SPLIT': { "left_col_title": string, "left_col_text": string[], "right_col_title": string, "right_col_text": string[] }
- 'BIG_QUOTE_TAKEAWAY': { "quote": string, "author_or_source": string }
- 'KPI_BIG_NUMBER': { "metrics": Array<{ "value": string, "label": string }> }
- 'CHART_INSIGHT': { "chart_type": "bar" | "line" | "pie", "chart_data": Array<{ "label": string, "value": number, "display_value"?: string }>, "insight_text": string }
- 'DATA_TABLE': { "headers": string[], "rows": string[][] }
- 'MEDIA_TEXT': { "image_prompt_description": string, "body_text": string }
- 'TIMELINE_MILESTONES': { "events": Array<{ "date_or_step": string, "description": string }> }
- 'STEP_BY_STEP': { "steps": string[] }
- 'CONCLUSION_SUMMARY': { "summary_points": string[] }
- 'CALL_TO_ACTION': { "action_items": string[] }
- 'QA_CONTACT': { "footer_note": string }
- 'REFERENCES_LIST': { "sources": Array<{ "title": string, "url": string, "summary"?: string }> } (If the lesson content does not explicitly contain reference links, generate 2-3 highly relevant, reputable external references, books, or online articles on this topic)
- 'STATEMENT_IMAGE': { "statement": string, "body_text": string, "image_prompt_description": string }
- 'PYRAMID_LEVELS': { "levels": Array<{ "title": string, "description": string }>, "footer_note"?: string } (3–5 levels, apex first)
- 'FUNNEL_STAGES': { "stages": Array<{ "title": string, "description": string }>, "footer_note"?: string } (3–5 stages, widest first)
- 'PROCESS_ARROWS': { "process_steps": Array<{ "title": string, "description": string }>, "footer_note"?: string } (3–5 steps, titles ≤3 words, descriptions ≤10 words)
- 'CIRCLE_CYCLE': { "phases": Array<{ "title": string, "description": string }>, "footer_note"?: string } (4–6 phases, clockwise from top)

STYLE SELECTION:
Pick the ONE visual style that best matches this lesson's subject and tone, and return its name as 'recommendedCollection':
${Object.entries(styles)
  .map(([name, desc]) => `- '${name}': ${desc}`)
  .join('\n')}

HARD CONSTRAINTS:
1. Output EXACTLY ${targetSlideCount} slides — no more, no fewer.
2. Use only the allowed layoutType values, and only the binding keys listed for that layout.
3. Populate every required field with real, complete content drawn from the lesson.
4. Every agenda item MUST correspond to a topic explicitly covered by later slides.
5. Set 'recommendedCollection' to exactly one of the style names listed above.
    `.trim();
  }

  /**
   * Builds a planning prompt tailored to a custom template's own category names.
   * Instead of fixed binding specs, the AI fills in generic content keys that
   * the SVG renderer can map to text regions.
   */
  private static buildCustomTemplatePrompt(opts: {
    lessonTitle: string;
    contentSnippet: string;
    targetSlideCount: number;
    templateCategories: string[];
    templateCategoryMetadata?: TemplateCategoryMetadataMap;
    context?: string;
  }): string {
    const {
      lessonTitle,
      contentSnippet,
      targetSlideCount,
      templateCategories,
      templateCategoryMetadata,
      context,
    } = opts;
    const categoryList = templateCategories.map((c) => `'${c}'`).join(', ');
    const categoryGuidanceBlock =
      PresentationService.buildCategoryGuidanceBlock(
        templateCategories,
        templateCategoryMetadata
      );

    return `
You are compiling a professional slide deck from the lesson below using a custom template.

Lesson Title: "${lessonTitle}"
Core Lesson Content:
${contentSnippet}

Target Slide Count: EXACTLY ${targetSlideCount} slides.
${context ? `\nUser Guidelines:\n"${context}"\n` : ''}
AVAILABLE LAYOUT TYPES (from the selected template — use ONLY these):
${categoryList}
${categoryGuidanceBlock ? `\nTEMPLATE CATEGORY GUIDANCE:\n${categoryGuidanceBlock}\n` : ''}

INSTRUCTIONS:
- Choose the most appropriate layout type for each slide based on its name (e.g. TEAM → team members, MISSION → company mission, TITLE_SLIDE → title slide).
- Distribute content naturally across the available types. Use each type that makes sense for the lesson.
- For each slide, produce a specific, descriptive slideTitle and meaningful bindings.
- Bindings should use these generic keys (fill whichever apply): {
    "title": string,
    "subtitle": string,
    "body": string,
    "bullets": string[],
    "items": string[],
    "author": string,
    "quote": string,
    "metrics": Array<{ "value": string, "label": string }>,
    "chart_data": Array<{ "label": string, "value": number, "display_value"?: string }>,
    "insight_text": string,
    "steps": string[],
    "events": Array<{ "date_or_step": string, "description": string }>,
    "summary_points": string[],
    "sources": Array<{ "title": string, "url": string, "summary"?: string }>
  }
- If you use 'CHART_INSIGHT', keep each item's 'value' numeric for scaling, use a short 'display_value' badge when it helps the audience interpret the number, and make 'insight_text' explain the takeaway instead of repeating raw values.
- Write complete, audience-facing copy — no placeholders, no "TODO".
- Match the lesson's language (write in Vietnamese if the lesson is in Vietnamese).

HARD CONSTRAINTS:
1. Output EXACTLY ${targetSlideCount} slides.
2. Use ONLY the layout types listed above — do NOT invent new ones.
3. Every slide must have real content drawn from the lesson.
    `.trim();
  }

  /** Runs the planning model and returns the validated slide plan. */
  private static async generatePlan(opts: {
    lessonTitle: string;
    lessonContent: unknown;
    duration: string;
    context?: string;
    standardCategoryMetadata?: TemplateCategoryMetadataMap;
    templateCategories?: string[];
    templateCategoryMetadata?: TemplateCategoryMetadataMap;
    styleCollections?: Record<string, string>;
  }): Promise<PresentationPlan> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error('Missing API key for provider "openrouter"');
    }

    const provider = createOpenRouter({ apiKey });
    const model = DEFAULT_MODELS.openrouter;

    const targetSlideCount = PresentationService.getTargetSlideCount(
      opts.duration
    );
    const contentSnippet = PresentationService.buildContentSnippet(
      opts.lessonContent
    );

    const isCustomTemplate =
      opts.templateCategories && opts.templateCategories.length > 0;

    const masterPrompt = isCustomTemplate
      ? PresentationService.buildCustomTemplatePrompt({
          lessonTitle: opts.lessonTitle,
          contentSnippet,
          targetSlideCount,
          templateCategories: opts.templateCategories!,
          templateCategoryMetadata: opts.templateCategoryMetadata,
          context: opts.context,
        })
      : PresentationService.buildMasterPrompt({
          lessonTitle: opts.lessonTitle,
          contentSnippet,
          targetSlideCount,
          context: opts.context,
          standardCategoryMetadata: opts.standardCategoryMetadata,
          styleCollections: opts.styleCollections,
        });

    const { output } = await generateText({
      model: provider(model),
      output: Output.object({ schema: presentationPlanSchema }),
      prompt: masterPrompt,
      instructions: PLANNER_SYSTEM_PROMPT,
      temperature: 0.7,
      // Detailed decks (up to 20 fully-populated slides) need plenty of room.
      maxOutputTokens: 16000,
    });

    return output;
  }

  static async planPresentation(options: {
    lessonId: string;
    userId: string;
    duration: string;
    context?: string;
  }): Promise<PresentationPlan> {
    const { lessonId, userId, duration, context } = options;

    const lesson = await LessonService.getLessonById(lessonId, userId);
    if (!lesson) {
      throw new Error('Lesson not found');
    }

    return PresentationService.generatePlan({
      lessonTitle: lesson.title,
      lessonContent: lesson.content,
      duration,
      context,
    });
  }

  static planPresentationStream(options: {
    lessonId: string;
    userId: string;
    duration: string;
    context?: string;
    standardCategoryMetadata?: TemplateCategoryMetadataMap;
    templateCategories?: string[];
    templateCategoryMetadata?: TemplateCategoryMetadataMap;
    styleCollections?: Record<string, string>;
  }): ReadableStream<string> {
    const {
      lessonId,
      userId,
      duration,
      context,
      standardCategoryMetadata,
      templateCategories,
      templateCategoryMetadata,
      styleCollections,
    } = options;
    const { readable, writable } = new TransformStream<string, string>();
    const writer = writable.getWriter();

    (async () => {
      try {
        const lesson = await LessonService.getLessonById(lessonId, userId);
        if (!lesson) {
          throw new Error('Lesson not found');
        }

        await writer.write(`${JSON.stringify({ type: 'compiling' })}\n`);

        const plan = await PresentationService.generatePlan({
          lessonTitle: lesson.title,
          lessonContent: lesson.content,
          duration,
          context,
          standardCategoryMetadata,
          templateCategories,
          templateCategoryMetadata,
          styleCollections,
        });

        // validate against the live inventory (or the built-in fallback)
        const knownStyles = getAvailableStyleCollections(styleCollections);
        const resolvedRecommendedCollection = resolveRecommendedCollection({
          recommendedCollection: plan.recommendedCollection,
          lessonTitle: lesson.title,
          lessonContent: lesson.content,
          context,
          styleCollections: knownStyles,
        });
        await writer.write(
          `${JSON.stringify({
            type: 'done',
            slides: plan.slides,
            recommendedCollection: resolvedRecommendedCollection,
          })}\n`
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        await writer.write(`${JSON.stringify({ type: 'error', message })}\n`);
      } finally {
        await writer.close();
      }
    })();

    return readable;
  }
}
