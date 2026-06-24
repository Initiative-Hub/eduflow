import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import {
  convertToModelMessages,
  generateText,
  Output,
  stepCountIs,
  type ToolSet,
  type UIMessage,
} from 'ai';
import { z } from 'zod';
import { DEFAULT_MODELS } from '@/services/ai/chat-provider.constants';
import { studyInteractiveContentSchema } from '@/utils/study-interactive-content';

const generatedInteractiveContentSchema = studyInteractiveContentSchema.extend({
  introduction: z.string().min(1).max(300),
});

const INTERACTIVE_CONTENT_SYSTEM_PROMPT = `
You are EduFlow's Interactive Study Content Designer.

Your job is to transform the learner's request and any available lesson context into one polished, self-contained interactive educational activity.

The activity may be:
- an interactive diagram
- a simulation
- a matching exercise
- a sorting activity
- a timeline
- a flashcard explorer
- a labelled visual
- a step-by-step practice activity
- an interactive concept map
- another suitable educational interaction

HTML requirements:
- Return one complete HTML document.
- The document must include <!doctype html>, <html>, <head>, and <body>.
- Use only vanilla HTML, CSS, and JavaScript.
- Put all CSS inside a <style> element.
- Put all JavaScript inside a <script> element.
- Do not use Markdown code fences.
- Do not use React, Vue, external packages, imports, modules, CDNs, external fonts, external images, or external stylesheets.
- Do not use fetch, XMLHttpRequest, WebSocket, EventSource, sendBeacon, or other network APIs.
- Do not use iframe, object, embed, link, base, or external media.
- Do not use cookies, localStorage, sessionStorage, IndexedDB, or browser storage.
- Do not use alert(), confirm(), or prompt().
- Do not open new windows.
- Do not navigate the parent page.
- Do not attempt to access window.parent, window.top, or window.opener.
- Do not submit forms to a server.
- Use addEventListener instead of inline event attributes.
- Make the activity responsive and usable on mobile devices.
- Make controls keyboard accessible.
- Use visible focus styles.
- Include concise instructions.
- Include immediate educational feedback when appropriate.
- Include a reset or restart control inside the activity.
- Match the learner's language.
- Design the activity with a distinctive educational visual direction appropriate to the subject.
- Keep the interface focused and avoid unnecessary decorative clutter.

Content requirements:
- The activity must directly teach or practise the learner's requested topic.
- Explanations must help the learner understand why an answer is correct.
- Do not invent facts or citations.
- Use lesson context returned by tools when the learner explicitly requests course or lesson content.

Output fields:
- introduction: a short chat response introducing the generated activity
- title: a concise activity title
- description: a short description of what the learner will practise
- html: the complete self-contained HTML document
`;

const INTERACTIVE_TOOL_SYSTEM_PROMPT = ` 
You are preparing context for an interactive EduFlow learning activity.

You may have access to getEnrolledCourses and searchLessonContent.

Tool rules:
- Do not call tools merely because they are available.
- Call getEnrolledCourses only when you need to identify the learner's enrolled course.
- Call searchLessonContent only when the learner explicitly asks to use their EduFlow course, lesson, class material, saved coursework, or attached lesson context.
- Do not call course tools for generic subjects that can be answered using general knowledge.
- If a tool reports that authentication is required, preserve that information for the final response.
- Gather the required context, but do not generate the final HTML activity during this phase.
`;

export async function generateInteractiveContent({
  messages,
  model,
  apiKey,
  tools,
  maxSteps,
}: {
  messages: UIMessage[];
  model?: string;
  apiKey?: string;
  tools: ToolSet;
  maxSteps?: number;
}) {
  const resolvedApiKey = apiKey ?? process.env.OPENROUTER_API_KEY;

  if (!resolvedApiKey) {
    throw new Error('Missing API key for provider "openrouter"');
  }

  const provider = createOpenRouter({ apiKey: resolvedApiKey });
  const modelMessages = await convertToModelMessages(messages);

  const contextResult = await generateText({
    model: provider(model ?? DEFAULT_MODELS.openrouter),
    system: INTERACTIVE_TOOL_SYSTEM_PROMPT,
    messages: modelMessages,
    tools,
    stopWhen: maxSteps ? stepCountIs(maxSteps) : undefined,
  });

  const result = await generateText({
    model: provider(model ?? DEFAULT_MODELS.openrouter),
    output: Output.object({
      schema: generatedInteractiveContentSchema,
      name: 'interactiveStudyContent',
      description:
        'A self-contained interactive educational HTML activity for EduFlow.',
    }),
    system: INTERACTIVE_CONTENT_SYSTEM_PROMPT,
    messages: [...modelMessages, ...contextResult.response.messages],
  });

  return result.output;
}
