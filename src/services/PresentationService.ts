import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText, Output } from 'ai';
import { z } from 'zod';
import { DEFAULT_MODELS } from '@/services/ai/chat-provider.constants';
import { LessonService } from '@/services/LessonService';
// Assuming you have or will implement a WebSearchService
import { WebSearchService } from './WebSearchService';

// 1. The Schema for the Intermediate Agent Step (Structure + Search Queries)
const intermediateAnalysisSchema = z.object({
  searchQueries: z
    .array(z.string())
    .describe(
      'Highly specific, targeted search queries (2-4 queries total) to fetch real-world data, latest examples, or statistics relevant to this lesson content.'
    ),
  plannedSlides: z.array(
    z.object({
      layoutType: z.enum([
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
      ]),
      focusTopic: z
        .string()
        .describe(
          'The primary educational concept this specific slide must address.'
        ),
    })
  ),
});

// 2. The Final Output Schema for the Presentation Builder
export const presentationPlanSchema = z.object({
  slides: z.array(
    z.object({
      layoutType: z.string(),
      slideTitle: z.string(),
      bindings: z.record(z.string(), z.any()),
    })
  ),
});

export type PresentationPlan = z.infer<typeof presentationPlanSchema>;

export class PresentationService {
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

    const lessonTitle = lesson.title;
    const lessonContent = lesson.content;

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error('Missing API key for provider "openrouter"');
    }

    const provider = createOpenRouter({ apiKey });
    const model = DEFAULT_MODELS.openrouter;

    let targetSlideCount = 5;
    if (duration === '5') targetSlideCount = 3;
    else if (duration === '10') targetSlideCount = 4;
    else if (duration === '15') targetSlideCount = 5;
    else if (duration === '30') targetSlideCount = 8;
    else if (duration === '45') targetSlideCount = 10;
    else if (duration === '60') targetSlideCount = 12;
    else if (duration === '90') targetSlideCount = 16;
    else if (duration === '120') targetSlideCount = 20;

    let contentSnippet =
      typeof lessonContent === 'object'
        ? JSON.stringify(lessonContent)
        : String(lessonContent || '');
    contentSnippet = contentSnippet.slice(0, 12000);

    // ==========================================
    // AGENT STEP 1: Structural Planner & Search Extractor
    // ==========================================
    const plannerPrompt = `
      You are an instructional architect. Analyze this lesson content and plan the macro presentation flow.
      Identify what real-world validation, recent case studies, or statistics are missing that could enrich this deck, and generate targeted web search queries for them.

      Lesson Title: "${lessonTitle}"
      Content: ${contentSnippet}
      Target Slide Count: Exactly ${targetSlideCount} slides.
      
      Requirements:
      1. You MUST generate EXACTLY ${targetSlideCount} slides in your 'plannedSlides' array. Do not generate more or fewer slides.
      ${context ? `2. User Custom Guidelines / Specific Request:\n"${context}"\nYou MUST incorporate these custom instructions into the structure, layout selections, and focus topics.` : ''}
    `;

    const plannerResponse = await generateText({
      model: provider(model),
      output: Output.object({ schema: intermediateAnalysisSchema }),
      prompt: plannerPrompt,
      system:
        'You are an AI planner. Your job is to read lesson material, decide the sequence of presentation layouts, and output search keywords to find grounding context on the web.',
    });

    const { searchQueries, plannedSlides } = plannerResponse.output;

    // ==========================================
    // AGENT STEP 2: Execute Tool (Web Search)
    // ==========================================
    let webSearchContext = '';
    const sourcesList: Array<{ title: string; url: string }> = [];
    if (searchQueries && searchQueries.length > 0) {
      try {
        // Execute queries concurrently to optimize performance
        const searchResults = await Promise.all(
          searchQueries.slice(0, 3).map(async (query) => {
            const results = await WebSearchService.search(query);
            if (results && Array.isArray(results.results)) {
              for (const r of results.results) {
                if (
                  r.title &&
                  r.url &&
                  !sourcesList.some((s) => s.url === r.url)
                ) {
                  sourcesList.push({ title: r.title, url: r.url });
                }
              }
            }
            return `Results for query "${query}":\n${JSON.stringify(results)}`;
          })
        );
        webSearchContext = searchResults.join('\n\n');
      } catch (error) {
        console.error(
          'Web search pipeline execution failed, proceeding with original context only.',
          error
        );
      }
    }

    // ==========================================
    // AGENT STEP 3: Content Compiler & Binding Generation
    // ==========================================
    const compilerPrompt = `
      You are a presentation compilation engine. Assemble the final slide data values using the structural blueprint and the live web search context collected by your retrieval agent.

      Lesson Title: "${lessonTitle}"
      Core Lesson Content: ${contentSnippet}
      
      Live Grounding Web Context:
      ${webSearchContext || 'No external web data retrieved.'}

      Pre-Planned Layout Blueprint Sequence:
      ${JSON.stringify(plannedSlides, null, 2)}

      Instructions:
      For each slide listed in the blueprint sequence, map the compiled information into the requested schema fields. Use the Web Context to fill out data points like statistics (for KPI slides), charts, or recent real-world examples to make the lesson exceptionally practical.
      ${context ? `\nUser Custom Guidelines / Specific Request:\n"${context}"\nEnsure that all compiled slide content strictly adheres to these instructions.` : ''}
    `;

    const finalResponse = await generateText({
      model: provider(model),
      output: Output.object({ schema: presentationPlanSchema }),
      prompt: compilerPrompt,
      system:
        'You are an execution agent that binds raw core content and web retrieval contexts directly into precise presentation design specifications.',
    });

    const slides = [...finalResponse.output.slides];
    if (sourcesList.length > 0) {
      slides.push({
        layoutType: 'REFERENCES_LIST',
        slideTitle: 'References & Sources',
        bindings: {
          sources: sourcesList,
        },
      });
    }

    return { slides };
  }

  static planPresentationStream(options: {
    lessonId: string;
    userId: string;
    duration: string;
    context?: string;
  }): ReadableStream<string> {
    const { lessonId, userId, duration, context } = options;
    const { readable, writable } = new TransformStream<string, string>();
    const writer = writable.getWriter();

    (async () => {
      try {
        const lesson = await LessonService.getLessonById(lessonId, userId);
        if (!lesson) {
          throw new Error('Lesson not found');
        }

        const lessonTitle = lesson.title;
        const lessonContent = lesson.content;

        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) {
          throw new Error('Missing API key for provider "openrouter"');
        }

        const provider = createOpenRouter({ apiKey });
        const model = DEFAULT_MODELS.openrouter;

        let targetSlideCount = 5;
        if (duration === '5') targetSlideCount = 3;
        else if (duration === '10') targetSlideCount = 4;
        else if (duration === '15') targetSlideCount = 5;
        else if (duration === '30') targetSlideCount = 8;
        else if (duration === '45') targetSlideCount = 10;
        else if (duration === '60') targetSlideCount = 12;
        else if (duration === '90') targetSlideCount = 16;
        else if (duration === '120') targetSlideCount = 20;

        let contentSnippet =
          typeof lessonContent === 'object'
            ? JSON.stringify(lessonContent)
            : String(lessonContent || '');
        contentSnippet = contentSnippet.slice(0, 12000);

        // ==========================================
        // AGENT STEP 1: Structural Planner & Search Extractor
        // ==========================================
        await writer.write(`${JSON.stringify({ type: 'planning' })}\n`);

        const plannerPrompt = `
          You are an instructional architect. Analyze this lesson content and plan the macro presentation flow.
          Identify what real-world validation, recent case studies, or statistics are missing that could enrich this deck, and generate targeted web search queries for them.

          Lesson Title: "${lessonTitle}"
          Content: ${contentSnippet}
          Target Slide Count: Exactly ${targetSlideCount} slides.

          Requirements:
          1. You MUST generate EXACTLY ${targetSlideCount} slides in your 'plannedSlides' array. Do not generate more or fewer slides.
          ${context ? `2. User Custom Guidelines / Specific Request:\n"${context}"\nYou MUST incorporate these custom instructions into the structure, layout selections, and focus topics.` : ''}
        `;

        const plannerResponse = await generateText({
          model: provider(model),
          output: Output.object({ schema: intermediateAnalysisSchema }),
          prompt: plannerPrompt,
          system:
            'You are an AI planner. Your job is to read lesson material, decide the sequence of presentation layouts, and output search keywords to find grounding context on the web.',
        });

        const { searchQueries, plannedSlides } = plannerResponse.output;

        // Emit search queries to client
        await writer.write(
          `${JSON.stringify({ type: 'search-queries', queries: searchQueries || [] })}\n`
        );

        // ==========================================
        // AGENT STEP 2: Execute Tool (Web Search)
        // ==========================================
        let webSearchContext = '';
        const sourcesList: Array<{ title: string; url: string }> = [];
        if (searchQueries && searchQueries.length > 0) {
          try {
            // Execute queries concurrently to optimize performance
            const searchResults = await Promise.all(
              searchQueries.slice(0, 3).map(async (query) => {
                const results = await WebSearchService.search(query);

                // Stream each result/source found to client
                if (results && Array.isArray(results.results)) {
                  for (const r of results.results) {
                    if (
                      r.title &&
                      r.url &&
                      !sourcesList.some((s) => s.url === r.url)
                    ) {
                      sourcesList.push({ title: r.title, url: r.url });
                    }
                    await writer.write(
                      `${JSON.stringify({
                        type: 'source-found',
                        source: {
                          title: r.title,
                          url: r.url,
                          summary: r.content ? r.content.slice(0, 200) : '',
                        },
                      })}\n`
                    );
                  }
                }

                return `Results for query "${query}":\n${JSON.stringify(results)}`;
              })
            );
            webSearchContext = searchResults.join('\n\n');
          } catch (error) {
            console.error(
              'Web search pipeline execution failed, proceeding with original context only.',
              error
            );
          }
        }

        // ==========================================
        // AGENT STEP 3: Content Compiler & Binding Generation
        // ==========================================
        await writer.write(`${JSON.stringify({ type: 'compiling' })}\n`);

        const compilerPrompt = `
          You are a presentation compilation engine. Assemble the final slide data values using the structural blueprint and the live web search context collected by your retrieval agent.

          Lesson Title: "${lessonTitle}"
          Core Lesson Content: ${contentSnippet}
          
          Live Grounding Web Context:
          ${webSearchContext || 'No external web data retrieved.'}

          Pre-Planned Layout Blueprint Sequence:
          ${JSON.stringify(plannedSlides, null, 2)}

          Instructions:
          For each slide listed in the blueprint sequence, map the compiled information into the requested schema fields. Use the Web Context to fill out data points like statistics (for KPI slides), charts, or recent real-world examples to make the lesson exceptionally practical.
          ${context ? `\nUser Custom Guidelines / Specific Request:\n"${context}"\nEnsure that all compiled slide content strictly adheres to these instructions.` : ''}
        `;

        const finalResponse = await generateText({
          model: provider(model),
          output: Output.object({ schema: presentationPlanSchema }),
          prompt: compilerPrompt,
          system:
            'You are an execution agent that binds raw core content and web retrieval contexts directly into precise presentation design specifications.',
        });

        const slides = [...finalResponse.output.slides];
        if (sourcesList.length > 0) {
          slides.push({
            layoutType: 'REFERENCES_LIST',
            slideTitle: 'References & Sources',
            bindings: {
              sources: sourcesList,
            },
          });
        }

        await writer.write(`${JSON.stringify({ type: 'done', slides })}\n`);
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
