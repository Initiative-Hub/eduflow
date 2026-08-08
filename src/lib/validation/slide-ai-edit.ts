import * as z from 'zod';

export const slideAiEditItemSchema = z.object({
  id: z.string().trim().min(1).max(100),
  text: z.string().trim().min(1).max(2000),
  maxCharacters: z.number().int().min(1).max(2000),
});

export const slideAiEditRequestSchema = z
  .object({
    scope: z.enum(['element', 'slide']),
    instruction: z.string().trim().min(2).max(1000),
    items: z.array(slideAiEditItemSchema).min(1).max(80),
  })
  .superRefine((value, context) => {
    if (value.scope === 'element' && value.items.length !== 1) {
      context.addIssue({
        code: 'custom',
        message: 'Element edits require exactly one text item',
        path: ['items'],
      });
    }

    if (
      new Set(value.items.map((item) => item.id)).size !== value.items.length
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Text item IDs must be unique',
        path: ['items'],
      });
    }
  });

export const slideAiEditResponseSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      text: z.string(),
    })
  ),
});

export type SlideAiEditRequest = z.infer<typeof slideAiEditRequestSchema>;
export type SlideAiEditResponse = z.infer<typeof slideAiEditResponseSchema>;
export type SlideAiEditScope = SlideAiEditRequest['scope'];
