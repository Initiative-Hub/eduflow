import type { JSONContent } from '@tiptap/core';
import { z } from 'zod';

/**
 * Zod schema for Tiptap JSON content
 */
const tiptapNodeSchema = z.custom<JSONContent>();
const tiptapDocumentSchema = z.looseObject({
  type: z.literal('doc'),
  content: z.array(tiptapNodeSchema),
});

export const aiCourseGenerationSchema = z.object({
  courseTitle: z.string().describe('The overall title of the course'),
  description: z
    .string()
    .describe('A short summary of what the student will learn'),
  modules: z.array(
    z.object({
      title: z.string().describe('The title of the module'),
      description: z
        .string()
        .describe('A brief overview of what this module covers'),
      lessons: z.array(
        z.object({
          lessonTitle: z.string().describe('The title of the lesson'),
          content: tiptapDocumentSchema.describe(
            'Detailed, comprehensive lesson content as Tiptap JSON. The root must be a doc node with content nodes such as heading, paragraph, bulletList, orderedList, listItem, blockquote, codeBlock, and youtube.'
          ),
        })
      ),
    })
  ),
});

export type AICourseGeneration = z.infer<typeof aiCourseGenerationSchema>;
