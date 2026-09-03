import * as z from 'zod';
import { studyInteractiveContentSchema } from '@/utils/study-interactive-content';

const safeFileNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .refine((value) => !/[\\/\r\n]/.test(value), 'Invalid file name');

const wordbankLabelsSchema = z
  .object({
    englishDefinition: z.string().min(1).max(100),
    exampleSentence: z.string().min(1).max(100),
    mastery: z.string().min(1).max(100),
    pronunciation: z.string().min(1).max(100),
    title: z.string().min(1).max(100),
    vietnameseTranslation: z.string().min(1).max(100),
    word: z.string().min(1).max(100),
    wordLists: z.string().min(1).max(100),
  })
  .strict();

export const cloudDriveExportSourceSchema = z.discriminatedUnion('kind', [
  z
    .object({
      fileName: safeFileNameSchema,
      kind: z.literal('wordbank_csv'),
      labels: wordbankLabelsSchema,
      vocabularyIds: z
        .array(z.string().uuid())
        .min(1)
        .max(500)
        .refine((ids) => new Set(ids).size === ids.length, {
          message: 'Vocabulary IDs must be unique',
        }),
    })
    .strict(),
  z
    .object({
      chatId: z.string().min(1).max(200),
      content: studyInteractiveContentSchema.optional(),
      contentIndex: z.number().int().min(0).max(100),
      fileName: safeFileNameSchema,
      kind: z.literal('study_interactive_html'),
      messageId: z.string().min(1).max(200),
    })
    .strict(),
  z
    .object({
      kind: z.literal('lesson_presentation'),
      lessonId: z.string().uuid(),
    })
    .strict(),
  z
    .object({
      courseId: z.string().uuid().optional(),
      fileId: z.string().uuid(),
      kind: z.literal('inventory_file'),
    })
    .strict(),
]);

export const cloudDriveExportRequestSchema = z
  .object({
    requestId: z.string().uuid(),
    source: cloudDriveExportSourceSchema,
  })
  .strict();

export type CloudDriveExportSource = z.infer<
  typeof cloudDriveExportSourceSchema
>;
