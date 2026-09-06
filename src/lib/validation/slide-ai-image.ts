import * as z from 'zod';

export const slideImageAspectRatioSchema = z.enum([
  '1:1',
  '1:2',
  '2:1',
  '2:3',
  '3:2',
  '3:4',
  '4:3',
  '4:5',
  '5:4',
  '9:16',
  '16:9',
]);

export const slideDeckIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid slide deck ID');

export const slideMediaIdSchema = z
  .string()
  .trim()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    'Invalid slide media ID'
  );

export const slideAiImageRequestSchema = z.object({
  deckId: slideDeckIdSchema,
  prompt: z.string().trim().min(2).max(2000),
  aspectRatio: slideImageAspectRatioSchema,
});

export const slideAiImageResponseSchema = z.object({
  imageUrl: z.string().startsWith('/api/v1/ai/slides/'),
});

export type SlideImageAspectRatio = z.infer<typeof slideImageAspectRatioSchema>;
export type SlideAiImageRequest = z.infer<typeof slideAiImageRequestSchema>;
export type SlideAiImageResponse = z.infer<typeof slideAiImageResponseSchema>;
