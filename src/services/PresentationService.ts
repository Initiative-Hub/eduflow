import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText, Output } from 'ai';
import { z } from 'zod';
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
    'White, minimal, one strong blue accent — business, science, data-heavy or formal academic material.',
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
};

export const presentationPlanSchema = z.object({
  slides: z.array(
    z.object({
      layoutType: z.string(),
      slideTitle: z.string(),
      bindings: z.record(z.string(), z.any()),
    })
  ),
  // Style collection the AI judged best-fitting for the lesson (optional).
  recommendedCollection: z.string().optional(),
});

export type PresentationPlan = z.infer<typeof presentationPlanSchema>;

const PLANNER_SYSTEM_PROMPT =
  'You are a senior instructional designer and keynote presentation architect. ' +
  'You turn raw lesson material into polished, presentation-ready slide decks: ' +
  'you pick the single best layout for each idea, extract the concrete facts ' +
  '(numbers, names, dates, comparisons, quotes) from the source, and write ' +
  'complete, audience-facing copy — never placeholders, never generic filler.';

export class PresentationService {
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
    styleCollections?: Record<string, string>;
  }): string {
    const { lessonTitle, contentSnippet, targetSlideCount, context } = opts;
    // live inventory (local + S3) when available; built-in list otherwise
    const styles =
      opts.styleCollections && Object.keys(opts.styleCollections).length > 0
        ? opts.styleCollections
        : STYLE_COLLECTIONS;

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
NARRATIVE & STRUCTURE
- Build a coherent story arc, not a pile of bullet slides.
- Slide 1 MUST be 'TITLE_SLIDE'. Slide 2 SHOULD be 'AGENDA_OUTLINE' summarizing what the deck covers (unless the deck is very short, ≤3 slides).
- Use 'SECTION_HEADER' to transition between major parts of longer decks.
- End the deck with a wrap-up: a 'CONCLUSION_SUMMARY' of key takeaways, and where it fits a 'CALL_TO_ACTION', 'QA_CONTACT', or 'REFERENCES_LIST'.
CHOOSE THE BEST LAYOUT FOR EACH IDEA (do not default everything to TITLE_BULLETS — aim for variety):
- Hard numbers, stats, metrics, KPIs → 'KPI_BIG_NUMBER' (2–4 metrics with real values + labels).
- Numeric data worth comparing across categories → 'CHART_INSIGHT' (pick bar/line/pie, 3–5 data points, plus a one-sentence insight).
- "X vs Y", pros/cons, before/after, two perspectives → 'TWO_COLUMN_SPLIT'.
- A process, "how it works", or ordered method → 'STEP_BY_STEP' (3–6 concrete steps).
- Chronology, roadmap, history, milestones, phases → 'TIMELINE_MILESTONES' (3–6 events).
- A memorable quote, testimonial, or single big takeaway → 'BIG_QUOTE_TAKEAWAY'.
- An evocative, narrative or scene-setting idea best told as one poetic statement with a large illustration → 'STATEMENT_IMAGE' (statement ≤70 chars + a short supporting paragraph + a vivid image_prompt_description).
- Structured rows/columns of facts → 'DATA_TABLE' (clear headers + at least 3 rows).
- A point best paired with a visual, demo, screenshot, or diagram → 'MEDIA_TEXT' (write a vivid image_prompt_description).
- A set of related points or features with no stronger structure → 'TITLE_BULLETS' (3–5 substantive bullets).
- Ranked levels, priorities, maturity models, value hierarchies → 'PYRAMID_LEVELS' (3–5 levels, most important at the apex).
- Conversion funnels, filtering/narrowing pipelines → 'FUNNEL_STAGES' (3–5 stages, widest first).
- A left-to-right visual flow where each step deserves a short description → 'PROCESS_ARROWS' (3–5 chevron steps; prefer over STEP_BY_STEP when each step needs explanation).
- Recurring cycles, iterative loops, continuous processes → 'CIRCLE_CYCLE' (4–6 phases).
- External sources, links, citations → 'REFERENCES_LIST'.

CONTENT DEPTH (this is what "detailed" means):
- Extract the SPECIFICS from the lesson: real figures, names, dates, examples, and comparisons. If the lesson says "2.4 billion USD market, 18M students, 32% growth", surface those exact numbers on a KPI/CHART slide.
- Write complete, self-contained sentences and labels — copy that reads well on screen. No "TODO", no "Lorem ipsum", no "etc.", no empty fields.
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
- 'CHART_INSIGHT': { "chart_type": "bar" | "line" | "pie", "chart_data": Array<{ "label": string, "value": number }>, "insight_text": string }
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
4. Set 'recommendedCollection' to exactly one of the style names listed above.
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
    context?: string;
  }): string {
    const {
      lessonTitle,
      contentSnippet,
      targetSlideCount,
      templateCategories,
      context,
    } = opts;
    const categoryList = templateCategories.map((c) => `'${c}'`).join(', ');

    return `
You are compiling a professional slide deck from the lesson below using a custom template.

Lesson Title: "${lessonTitle}"
Core Lesson Content:
${contentSnippet}

Target Slide Count: EXACTLY ${targetSlideCount} slides.
${context ? `\nUser Guidelines:\n"${context}"\n` : ''}
AVAILABLE LAYOUT TYPES (from the selected template — use ONLY these):
${categoryList}

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
    "steps": string[],
    "events": Array<{ "date_or_step": string, "description": string }>,
    "summary_points": string[],
    "sources": Array<{ "title": string, "url": string, "summary"?: string }>
  }
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
    templateCategories?: string[];
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
          context: opts.context,
        })
      : PresentationService.buildMasterPrompt({
          lessonTitle: opts.lessonTitle,
          contentSnippet,
          targetSlideCount,
          context: opts.context,
          styleCollections: opts.styleCollections,
        });

    const finalResponse = await generateText({
      model: provider(model),
      output: Output.object({ schema: presentationPlanSchema }),
      prompt: masterPrompt,
      instructions: PLANNER_SYSTEM_PROMPT,
      temperature: 0.7,
      // Detailed decks (up to 20 fully-populated slides) need plenty of room.
      maxOutputTokens: 16000,
    });

    return finalResponse.output;
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
    templateCategories?: string[];
    styleCollections?: Record<string, string>;
  }): ReadableStream<string> {
    const {
      lessonId,
      userId,
      duration,
      context,
      templateCategories,
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
          templateCategories,
          styleCollections,
        });

        // validate against the live inventory (or the built-in fallback)
        const knownStyles = styleCollections ?? STYLE_COLLECTIONS;
        await writer.write(
          `${JSON.stringify({
            type: 'done',
            slides: plan.slides,
            recommendedCollection:
              plan.recommendedCollection &&
              plan.recommendedCollection in knownStyles
                ? plan.recommendedCollection
                : undefined,
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
