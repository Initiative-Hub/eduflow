import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText, Output } from 'ai';
import { z } from 'zod';
import { DEFAULT_MODELS } from '@/services/ai/chat-provider.constants';
import { LessonService } from '@/services/LessonService';
export const presentationPlanSchema = z.object({
  slides: z.array(
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
        'REFERENCES_LIST',
      ]),
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

    const masterPrompt = `
      You are an instructional architect and presentation compilation engine. Your job is to analyze the lesson content and build a slide presentation plan structure and content.

      Lesson Title: "${lessonTitle}"
      Core Lesson Content: ${contentSnippet}
      Target Slide Count: Exactly ${targetSlideCount} slides.

      Requirements:
      1. You MUST generate EXACTLY ${targetSlideCount} slides in your 'slides' list. Do not generate more or fewer slides.
      2. For each slide, select the most appropriate layoutType from the allowed schema enum values.
      3. For each slide, compile and populate the content values directly into the required fields inside the 'bindings' object.
      ${context ? `4. User Custom Guidelines / Specific Request:\n"${context}"\nYou MUST incorporate these custom instructions into the structure, layout selections, focus topics, and slide content compilation.` : ''}

      Layout Binding Specifications (You MUST use these exact keys in the 'bindings' object of each slide):
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
      - 'REFERENCES_LIST': { "sources": Array<{ "title": string, "url": string, "summary"?: string }> }

      Ensure that all slide content bindings strictly adhere to these instructions.
    `;

    const finalResponse = await generateText({
      model: provider(model),
      output: Output.object({ schema: presentationPlanSchema }),
      prompt: masterPrompt,
      system:
        'You are an instructional presentation architect that compiles core lesson material directly into precise, complete slide deck designs.',
    });

    return finalResponse.output;
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
        // SINGLE MASTER PLANNER & COMPILER CALL
        // ==========================================
        await writer.write(`${JSON.stringify({ type: 'compiling' })}\n`);

        const masterPrompt = `
          You are an instructional architect and presentation compilation engine. Your job is to analyze the lesson content and build a slide presentation plan structure and content.

          Lesson Title: "${lessonTitle}"
          Core Lesson Content: ${contentSnippet}
          Target Slide Count: Exactly ${targetSlideCount} slides.

          Requirements:
          1. You MUST generate EXACTLY ${targetSlideCount} slides in your 'slides' list. Do not generate more or fewer slides.
          2. For each slide, select the most appropriate layoutType from the allowed schema enum values.
          3. For each slide, compile and populate the content values directly into the required fields inside the 'bindings' object.
          ${context ? `4. User Custom Guidelines / Specific Request:\n"${context}"\nYou MUST incorporate these custom instructions into the structure, layout selections, focus topics, and slide content compilation.` : ''}

          Layout Binding Specifications (You MUST use these exact keys in the 'bindings' object of each slide):
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
          - 'REFERENCES_LIST': { "sources": Array<{ "title": string, "url": string, "summary"?: string }> }

          Ensure that all slide content bindings strictly adhere to these instructions.
        `;

        const finalResponse = await generateText({
          model: provider(model),
          output: Output.object({ schema: presentationPlanSchema }),
          prompt: masterPrompt,
          system:
            'You are an instructional presentation architect that compiles core lesson material directly into precise, complete slide deck designs.',
        });

        const slides = finalResponse.output.slides;
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
