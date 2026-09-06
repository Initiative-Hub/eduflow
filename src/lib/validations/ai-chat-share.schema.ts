import { z } from 'zod';

export const shareableAiChatTypeSchema = z.enum([
  'CHAT_ASSISTANT',
  'SOCRATIC_TUTOR',
  'WRITING_ASSISTANT',
  'STUDY_ASSISTANT',
]);

export type ShareableAiChatType = z.infer<typeof shareableAiChatTypeSchema>;

export const createAiChatShareSchema = z.object({
  chatId: z.uuid(),
  chatType: shareableAiChatTypeSchema,
});
