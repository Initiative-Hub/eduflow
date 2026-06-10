import * as z from 'zod';

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
          content: z
            .string()
            .describe(
              'Detailed, comprehensive lesson content formatted as an HTML string. Use semantic rich text tags such as <h1>, <h2>, <p>, <ul>, <ol>, <li>, <strong>, <em>, <blockquote>, <pre>, and <code>.'
            ),
        })
      ),
    })
  ),
});

export type AICourseGeneration = z.infer<typeof aiCourseGenerationSchema>;
