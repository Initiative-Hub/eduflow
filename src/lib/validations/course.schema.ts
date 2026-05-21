import * as zod from 'zod';
const z = (zod as any).z ?? (zod as any).default ?? zod;

/**
 * Zod schema for the Course model
 */
export const courseSchema = z.object({
  id: z.string().uuid().optional(),
  ownerId: z.string().uuid(),
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().optional().nullable(),
  isPublished: z.boolean().default(false),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

/**
 * Schema for creating a new course
 */
export const createCourseSchema = courseSchema.omit({
  id: true,
  ownerId: true,
  createdAt: true,
  updatedAt: true,
});

/**
 * Schema for updating an existing course
 */
export const updateCourseSchema = courseSchema
  .omit({
    id: true,
    ownerId: true,
    createdAt: true,
    updatedAt: true,
  })
  .partial();

/**
 * Zod schema for the Module model
 */
export const moduleSchema = z.object({
  id: z.string().uuid().optional(),
  courseId: z.string().uuid(),
  title: z.string().min(1, 'Title is required').max(255),
  orderIndex: z.number().int().default(0),
});

/**
 * Schema for creating a new module
 */
export const createModuleSchema = moduleSchema.omit({
  id: true,
  courseId: true,
});

/**
 * Zod schema for the Lesson model
 */
export const lessonSchema = z.object({
  id: z.string().uuid().optional(),
  moduleId: z.string().uuid(),
  title: z.string().min(1, 'Title is required').max(255),
  content: z.any().optional().nullable(), // Json content for Tiptap or other editors
  orderIndex: z.number().int().default(0),
});

/**
 * Schema for creating a new lesson
 */
export const createLessonSchema = lessonSchema.omit({
  id: true,
  moduleId: true,
});

// Types inferred from schemas
export type Course = z.infer<typeof courseSchema>;
export type CreateCourse = z.infer<typeof createCourseSchema>;
export type UpdateCourse = z.infer<typeof updateCourseSchema>;
export type Module = z.infer<typeof moduleSchema>;
export type CreateModule = z.infer<typeof createModuleSchema>;
export type Lesson = z.infer<typeof lessonSchema>;
export type CreateLesson = z.infer<typeof createLessonSchema>;

/**
 * Zod schema for AI course generation (structured output)
 */
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
              'Detailed, comprehensive lesson content formatted as an HTML string. Use <h1>, <h2>, <p>, <ul>, <li>, <strong>, etc. This should be extensive study material, not just a brief list.'
            ),
        })
      ),
    })
  ),
});

export type AICourseGeneration = z.infer<typeof aiCourseGenerationSchema>;
