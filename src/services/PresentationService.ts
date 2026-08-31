import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText, Output } from 'ai';
import * as z from 'zod';
import { tiptapDocumentToMarkdown } from '@/lib/tiptap-markdown';
import { DEFAULT_MODELS } from '@/services/ai/chat-provider.constants';
import { LessonService } from '@/services/LessonService';
import { isTiptapDocument } from '@/utils/lesson-content';

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
  pastel_pop:
    'Soft blush background, rose pink and mint accents, friendly rounded feel — younger audiences, wellbeing, creative or community topics.',
  illustrative_culture:
    'Warm cream background, hand-drawn vector buildings & clouds, Yogyakarta street aesthetic, sage green, sky blue, and gold accents — culture, art, architecture, geography, and storytelling.',
  minimalist_gradient:
    'Sleek dark theme with electric royal blue and violet gradient glows, crisp modern typography, and ambient grid lines — technology, start-ups, product design, business pitches, and modern tech topics.',
  organic_streets:
    'Cream paper, deep plum script headlines, golden sun discs, slate and terracotta organic blobs, line-art European street skylines — travel, geography, history, literature, art and storytelling topics.',
  eduflow_purple:
    'Deep slate canvas with violet accents, soft bordered cards and an ambient glow, matching the EduFlow platform itself — course material, product walkthroughs, internal training, onboarding, and any deck that should feel native to the product it was made in.',
  cultural_folk:
    'Warm plum-gray background, cream text, terracotta and sand accents with a grounded earth strip — culture, diversity, social studies, community, humanities and storytelling topics.',
  green_environment_care:
    'Cream paper, deep forest-green condensed headlines, lush nature photography, sage botanical ornaments, and subtle halftone texture — conservation, climate, ecology, sustainability, biodiversity, and environmental care topics.',
  startup_neon_pitch:
    'Black startup pitch deck with oversized white typography, electric blue and violet light trails, glossy gradient pills, and contact-footer details — startup pitches, business proposals, tech products, investor decks, and modern company presentations.',
  professional_focus:
    'Calm executive canvas with deep navy structure, precise teal signals, warm brass emphasis, generous whitespace, and varied editorial grids — strategy reviews, management briefings, consulting reports, project updates, financial analysis, and professional training.',
};

type TemplateCategoryMetadata = {
  description?: string;
  when_to_use?: string;
  prompt_hint?: string;
  content_guidance?: string[];
  /**
   * How much content a layout can actually hold. Extracted brand templates are
   * often sparse: a divider may expose only a `title` slot, and any extra
   * binding is dropped when the deck is filled, leaving a blank-looking slide.
   */
  text_slots?: number;
  image_slots?: number;
  capacity?: number;
};

/** Layouts at or below this capacity cannot hold body copy or lists. */
const TITLE_ONLY_CAPACITY = 1;

/**
 * A content slide needs at least this many characters of real copy, or two
 * list entries, to fill its layout. Below that the rendered slide is mostly
 * empty space around a heading.
 */
const MIN_SLIDE_CONTENT_CHARS = 90;
const MIN_SLIDE_LIST_ITEMS = 2;

/** How much lesson text the planner is given. Prose, not serialized nodes. */
const CONTENT_SNIPPET_LIMIT = 16000;

/**
 * Characters of explanation each content item should carry.
 *
 * A slide can clear the "not empty" bar and still say nothing: three cards
 * reading "Real exposure beats guesswork every time" are full by character
 * count and hollow to an audience. This is the floor for an item that actually
 * explains something — roughly a sentence of mechanism plus a specific.
 */
const MIN_ITEM_DEPTH_CHARS = 60;

/** Below this many items, an average is too noisy to judge depth from. */
const MIN_ITEMS_TO_JUDGE_DEPTH = 2;

/**
 * Binding fields whose entries are explanation the audience reads.
 *
 * Deliberately excludes `metrics`, `chart_data`, `headers` and `rows`: a KPI
 * label or a table cell is supposed to be terse, and "deepening" it would wreck
 * the layout it was written for.
 */
const EXPLANATORY_LIST_FIELDS = new Set([
  'bullets',
  'items',
  'steps',
  'summary_points',
  'action_items',
  'left_col_text',
  'right_col_text',
  'levels',
  'stages',
  'phases',
  'process_steps',
  'events',
  'sources',
]);

/** Prose fields that carry a slide's explanation in one block. */
const EXPLANATORY_PROSE_FIELDS = new Set([
  'body_text',
  'insight_text',
  'statement',
]);

/** Keys inside an item object that hold the explanation, not its label. */
const ITEM_DESCRIPTION_KEYS = new Set(['description', 'summary']);

/** Layout names that are dividers or covers by convention, so a bare title is correct. */
const TITLE_ONLY_LAYOUT_PATTERN =
  /(^|_)(TITLE|COVER|SECTION|DIVIDER|INTRO|END|CLOSING|THANK|QA|BLANK)(_|$)/i;

type TemplateCategoryMetadataMap = Record<string, TemplateCategoryMetadata>;

/**
 * One point in a bulleted list, as a single string.
 *
 * This was briefly a union of string and { title, description } to make the
 * "state the claim, then explain it" shape explicit. That compiles to `anyOf`,
 * which the planner model's structured-output schema handles badly — the call
 * ran for 40s and came back with nothing parseable ("No output generated").
 *
 * Nothing was lost by going back to a string: the renderer joins a pair as
 * "title — description" anyway, so an item written as "Claim — explanation"
 * produces byte-identical slides. The depth is carried by the prompt instead
 * of by the schema.
 */
const listPointSchema = z.string();

const slideBindingsSchema = z.object({
  subtitle: z.string().optional(),
  author: z.string().optional(),
  sub_module_name: z.string().optional(),
  bullets: z.array(listPointSchema).optional(),
  items: z.array(listPointSchema).optional(),
  steps: z.array(listPointSchema).optional(),
  summary_points: z.array(listPointSchema).optional(),
  action_items: z.array(listPointSchema).optional(),
  left_col_title: z.string().optional(),
  left_col_text: z.array(listPointSchema).optional(),
  right_col_title: z.string().optional(),
  right_col_text: z.array(listPointSchema).optional(),
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
  chart_type: z.enum(['bar', 'hbar', 'line', 'pie']).optional(),
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
  cultural_folk: ['cultural folk'],
  eduflow_purple: ['eduflow', 'eduflow purple', 'platform style'],
  green_environment_care: ['green environment care'],
  illustrative_culture: ['illustrative culture'],
  minimalist_gradient: ['minimalist gradient'],
  organic_streets: ['organic streets'],
  pastel_pop: ['pastel pop'],
  professional_focus: ['professional focus', 'executive focus'],
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

  /**
   * Tells the planner how much a layout can hold. Without this the model routes
   * body copy and lists into title-only layouts, where the content is silently
   * dropped and the slide renders as a heading on an empty background.
   */
  private static buildCapacityNote(
    guidance?: TemplateCategoryMetadata
  ): string {
    const textSlots = guidance?.text_slots;
    if (typeof textSlots !== 'number' || textSlots <= 0) return '';

    if (textSlots <= TITLE_ONLY_CAPACITY) {
      return ' [TITLE ONLY: this layout has room for a title and nothing else. Provide only slideTitle and leave bindings empty. Never use it for bullets, body text, lists, metrics or tables.]';
    }

    const capacity = guidance?.capacity ?? textSlots;
    return ` [holds up to ${textSlots} text slot(s), about ${capacity} content item(s) — keep content within this budget]`;
  }

  /**
   * A layout is title-only when the template says it has room for nothing else,
   * or (when the template reports no capacity) when its name marks it as a
   * cover, divider or closing slide.
   */
  private static isTitleOnlyLayout(
    layoutType: string,
    metadata?: TemplateCategoryMetadataMap
  ): boolean {
    const textSlots = metadata?.[layoutType]?.text_slots;
    if (typeof textSlots === 'number' && textSlots > 0) {
      return textSlots <= TITLE_ONLY_CAPACITY;
    }
    return TITLE_ONLY_LAYOUT_PATTERN.test(layoutType);
  }

  /** Counts the real copy a slide carries, ignoring the title and image prompts. */
  private static measureSlideContent(bindings: Record<string, unknown>): {
    chars: number;
    items: number;
  } {
    let chars = 0;
    let items = 0;

    for (const [key, value] of Object.entries(bindings)) {
      // The title lives outside bindings, and an image prompt is not slide copy.
      if (key === 'image_prompt_description' || key === 'chart_type') continue;

      if (typeof value === 'string') {
        chars += value.trim().length;
        continue;
      }
      if (!Array.isArray(value)) continue;

      for (const entry of value) {
        if (typeof entry === 'string') {
          if (entry.trim()) items += 1;
          chars += entry.trim().length;
        } else if (entry && typeof entry === 'object') {
          items += 1;
          for (const nested of Object.values(entry)) {
            if (typeof nested === 'string') chars += nested.trim().length;
          }
        }
      }
    }

    return { chars, items };
  }

  /**
   * True when a content layout was planned with too little copy to fill it.
   * Divider and cover layouts are exempt: a bare title is their whole purpose.
   */
  private static isUnderfilledSlide(
    slide: { layoutType: string; bindings: Record<string, unknown> },
    metadata?: TemplateCategoryMetadataMap
  ): boolean {
    if (PresentationService.isTitleOnlyLayout(slide.layoutType, metadata)) {
      return false;
    }

    const { chars, items } = PresentationService.measureSlideContent(
      slide.bindings ?? {}
    );
    return items < MIN_SLIDE_LIST_ITEMS && chars < MIN_SLIDE_CONTENT_CHARS;
  }

  /**
   * How much explanation each content item carries, on average.
   *
   * Separate from `measureSlideContent`, which asks whether a slide has any
   * copy at all. This asks whether that copy says anything: three one-line
   * assertions pass the first test and fail this one.
   */
  private static measureItemDepth(bindings: Record<string, unknown>): {
    items: number;
    avgChars: number;
  } {
    let items = 0;
    let chars = 0;

    for (const [key, value] of Object.entries(bindings)) {
      if (EXPLANATORY_PROSE_FIELDS.has(key) && typeof value === 'string') {
        const text = value.trim();
        if (text) {
          items += 1;
          chars += text.length;
        }
        continue;
      }
      if (!EXPLANATORY_LIST_FIELDS.has(key) || !Array.isArray(value)) continue;

      for (const entry of value) {
        if (typeof entry === 'string') {
          const text = entry.trim();
          if (!text) continue;
          items += 1;
          chars += text.length;
          continue;
        }
        if (!entry || typeof entry !== 'object') continue;
        // Title + description items are judged on the description alone; a
        // three-word heading is correct and says nothing about depth.
        items += 1;
        for (const [nestedKey, nested] of Object.entries(entry)) {
          if (
            ITEM_DESCRIPTION_KEYS.has(nestedKey) &&
            typeof nested === 'string'
          ) {
            chars += nested.trim().length;
          }
        }
      }
    }

    return { items, avgChars: items > 0 ? Math.round(chars / items) : 0 };
  }

  /**
   * True when a slide is populated but its copy only asserts.
   *
   * This is the "looks finished, reads hollow" case: every field filled, every
   * line a slogan. Underfilled slides are excluded because they need content
   * written from scratch, which is a different instruction to the model.
   */
  private static isShallowSlide(
    slide: { layoutType: string; bindings: Record<string, unknown> },
    metadata?: TemplateCategoryMetadataMap
  ): boolean {
    if (PresentationService.isTitleOnlyLayout(slide.layoutType, metadata)) {
      return false;
    }
    if (PresentationService.isUnderfilledSlide(slide, metadata)) return false;

    const { items, avgChars } = PresentationService.measureItemDepth(
      slide.bindings ?? {}
    );
    if (items < MIN_ITEMS_TO_JUDGE_DEPTH) return false;
    return avgChars < MIN_ITEM_DEPTH_CHARS;
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

        const capacityNote = PresentationService.buildCapacityNote(guidance);

        if (guidance?.prompt_hint) {
          return `- '${category}': ${guidance.prompt_hint}${capacityNote}`;
        }

        const fallbackBits = [guidance?.description, guidance?.when_to_use]
          .filter(Boolean)
          .join(' ');

        return fallbackBits
          ? `- '${category}': ${fallbackBits}${capacityNote}`
          : `- '${category}': Use the category name literally and fill it with real lesson content from the lesson.${capacityNote}`;
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

  /**
   * Normalizes lesson content (Tiptap JSON or string) into a prompt snippet.
   *
   * Lessons are stored as Tiptap JSON, where only about a third of the
   * characters are the lesson's own words — the rest is node scaffolding
   * (`{"type":"text","text":...}`, attrs, marks). Serializing that raw spent
   * most of the budget on structure the planner cannot use, and truncation cut
   * mid-node into malformed JSON. Markdown keeps the headings, lists and code
   * blocks the planner needs to find sections, and spends the budget on prose.
   */
  private static buildContentSnippet(lessonContent: unknown): string {
    if (isTiptapDocument(lessonContent)) {
      return tiptapDocumentToMarkdown(lessonContent).slice(
        0,
        CONTENT_SNIPPET_LIMIT
      );
    }
    const raw =
      typeof lessonContent === 'object'
        ? JSON.stringify(lessonContent)
        : String(lessonContent || '');
    return raw.slice(0, CONTENT_SNIPPET_LIMIT);
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
- EXPLAIN, DO NOT ASSERT. Every bullet, level, stage, phase and step must add something its own heading does not already say: the mechanism behind it, a worked example, a figure, a consequence, or the condition under which it holds. "Real exposure beats guesswork every time" is an empty slogan; "Two weeks shadowing a data team shows how much of the job is cleaning inputs, not modelling" earns its space.
- For diagram layouts whose items are { title, description } pairs (levels, stages, phases, process_steps), the title is the label and the description is where the substance goes — aim for roughly ${MIN_ITEM_DEPTH_CHARS}-${MIN_ITEM_DEPTH_CHARS * 2} characters of real explanation per item.
- WHAT "SHORT" MEANS IN A LAYOUT NOTE. When a layout note above says "tight", "short", "concise" or "extremely short", it is describing the TITLE half of an item and the number of items — never the description. A note that says "tight bullets" still wants ${MIN_ITEM_DEPTH_CHARS}+ characters of explanation attached to each bullet's title. The only cap you must respect literally is the item COUNT ("3 to 5 points"), and an explicit "TITLE ONLY" marker. Text that overflows one line wraps onto the next automatically, so a full sentence per item is safe — write the explanation.
- Give each slide enough substance to fill it (see the per-layout counts above). Prefer fewer, more substantial items over many thin ones.
- LIST SLIDES CARRY THE SAME BURDEN. Every entry in 'bullets', 'items', 'steps', 'summary_points' and 'action_items' is written as "Claim — explanation": a short claim, an em dash, then the substance behind it. "Test your career fit" is a headline; "Test your career fit — a 12-week placement tells you whether you actually enjoy the day-to-day work before you commit years to it" is a point worth a slide.
- Every slideTitle must be a specific, descriptive headline (e.g. "Market by the Numbers"), not a generic label like "Slide 4".
- Match the lesson's language (e.g. write the deck in Vietnamese if the lesson is in Vietnamese).

Layout Binding Specifications (use these EXACT keys in each slide's 'bindings' object):
- 'TITLE_SLIDE': { "subtitle": string, "author": string }
- 'AGENDA_OUTLINE': { "items": string[] }
- 'SECTION_HEADER': { "sub_module_name": string }
- 'TITLE_BULLETS': { "bullets": string[] }
    Write each bullet as "Claim — explanation": a short bold-able claim, an em dash,
    then the substance. A list of bare headlines is what makes a deck read as surface-level.
- 'TWO_COLUMN_SPLIT': { "left_col_title": string, "left_col_text": string[], "right_col_title": string, "right_col_text": string[] }
- 'BIG_QUOTE_TAKEAWAY': { "quote": string, "author_or_source": string }
- 'KPI_BIG_NUMBER': { "metrics": Array<{ "value": string, "label": string }> }
- 'CHART_INSIGHT': { "chart_type": "bar" | "hbar" | "line" | "pie", "chart_data": Array<{ "label": string, "value": number, "display_value"?: string }>, "insight_text": string }
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

NARRATIVE & STRUCTURE:
- Slide 1 MUST be the deck's opening/title slide: pick the available layout whose
  name most clearly means "title" or "cover" (e.g. TITLE_SLIDE, TITLE_SLIDE_2, COVER,
  INTRO). Only if no such layout exists, use the most title-like one available.
- Where the template offers a section-divider layout (e.g. SECTION_HEADER, DIVIDER),
  use it to transition between major parts of longer decks.
- End with a wrap-up: a summary/conclusion layout, and where one exists a
  call-to-action, thank-you or contact layout.
- Never repeat the opening/title layout later in the deck.

CONTENT DEPTH (applies to every slide that is not a cover or divider):
- A content slide must never be just a title. Fill it with at least ${MIN_SLIDE_LIST_ITEMS} list entries or at least ${MIN_SLIDE_CONTENT_CHARS} characters of prose, up to the layout's stated budget.
- Only cover/title and section-divider layouts may carry a title alone; for those, leave bindings empty.

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
4. The FIRST slide must be the title/cover layout described above.
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

    return PresentationService.enrichUnderfilledSlides({
      plan: output,
      lessonTitle: opts.lessonTitle,
      contentSnippet,
      provider,
      model,
      metadata: isCustomTemplate
        ? opts.templateCategoryMetadata
        : opts.standardCategoryMetadata,
    });
  }

  /**
   * Rewrites content slides the planner left nearly empty.
   *
   * The first pass sometimes returns a heading plus a single fragment for a
   * layout that has room for several points, which renders as a title floating
   * in white space. Divider and cover layouts are skipped, since a bare title is
   * their intended look.
   */
  private static async enrichUnderfilledSlides(opts: {
    plan: PresentationPlan;
    lessonTitle: string;
    contentSnippet: string;
    provider: ReturnType<typeof createOpenRouter>;
    model: string;
    metadata?: TemplateCategoryMetadataMap;
  }): Promise<PresentationPlan> {
    const { plan, metadata } = opts;
    const targets = plan.slides
      .map((slide, index) => ({ slide, index }))
      .map(({ slide, index }) => {
        const typed = slide as {
          layoutType: string;
          bindings: Record<string, unknown>;
        };
        if (PresentationService.isUnderfilledSlide(typed, metadata)) {
          return { slide, index, mode: 'fill' as const };
        }
        if (PresentationService.isShallowSlide(typed, metadata)) {
          return { slide, index, mode: 'deepen' as const };
        }
        return null;
      })
      .filter((entry) => entry !== null);

    if (targets.length === 0) return plan;

    const budgets = targets
      .map(({ slide, index, mode }) => {
        const capacity = metadata?.[slide.layoutType]?.capacity;
        const budget = capacity
          ? ` (fills about ${capacity} content item(s))`
          : '';
        const task =
          mode === 'fill'
            ? 'WRITE FROM SCRATCH (renders as a bare title today)'
            : 'DEEPEN (has copy, but it only asserts)';
        return `${index}: [${task}] layoutType '${slide.layoutType}'${budget} — title "${slide.slideTitle}"`;
      })
      .join('\n');

    try {
      const { output } = await generateText({
        model: opts.provider(opts.model),
        output: Output.object({
          schema: z.object({
            slides: z.array(
              z.object({
                index: z.number().int(),
                bindings: slideBindingsSchema,
              })
            ),
          }),
        }),
        instructions: PLANNER_SYSTEM_PROMPT,
        prompt: `These slides are not carrying their weight. Some are nearly empty; others are filled with copy that states a position without explaining it. Rewrite their content from the lesson below so a presenter could talk to each one.

Lesson Title: "${opts.lessonTitle}"
Core Lesson Content:
${opts.contentSnippet}

SLIDES TO REWRITE (return the same index for each):
${budgets}

RULES:
- Return bindings only; do not change layoutType or the slide title.
- Use the binding fields that match the layout's purpose (bullets/items/steps for lists, body_text for prose, metrics for figures, left_col_*/right_col_* for comparisons, levels/stages/phases/process_steps for diagram items).
- WRITE FROM SCRATCH slides need at least ${MIN_SLIDE_LIST_ITEMS} list entries, or at least ${MIN_SLIDE_CONTENT_CHARS} characters of prose.
- DEEPEN slides keep the same field names and the same number of items — expand the text inside them. Aim for about ${MIN_ITEM_DEPTH_CHARS}-${MIN_ITEM_DEPTH_CHARS * 2} characters of explanation per item.
- To deepen a thin list entry, keep it a single string and extend it to "Claim — explanation": the old text becomes the claim and the explanation follows the em dash. That keeps the field name and the item count while adding the substance.
- Every item must carry something the audience did not already know from its own heading: the mechanism, a worked example, a figure, a consequence, or the condition under which it applies. A restatement of the heading is a failure.
- Ban assertion-only copy. "Real exposure beats guesswork" says nothing; "Two weeks shadowing a data team shows you how much of the job is cleaning inputs, not modelling" says something.
- Draw every specific from the lesson. Do not invent figures, names or dates that are not in it.
- Respect the layout's item COUNT, but not its adjectives: long text wraps onto extra lines and the following items shift down, so a full sentence per item renders correctly. Thin copy is the failure mode here, not long copy.
- Write in the same language as the lesson content.`,
        temperature: 0.6,
        maxOutputTokens: 6000,
      });

      const enrichedByIndex = new Map(
        output.slides.map((entry) => [entry.index, entry.bindings])
      );
      const slides = plan.slides.map((slide, index) => {
        const enriched = enrichedByIndex.get(index);
        if (!enriched) return slide;
        // Keep anything the first pass produced; the second pass only adds.
        return { ...slide, bindings: { ...slide.bindings, ...enriched } };
      });

      return { ...plan, slides };
    } catch (error) {
      // A thin deck is still usable, so never fail planning over enrichment.
      console.warn('[PresentationService] Slide enrichment failed:', error);
      return plan;
    }
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
