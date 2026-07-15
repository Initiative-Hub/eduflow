import { apiClient } from '@/lib/api';
import type { ShareableAiChatType } from '@/lib/validations/ai-chat-share.schema';

export const aiChatShareClient = {
  createShare: (input: { chatId: string; chatType: ShareableAiChatType }) =>
    apiClient.post<{ shareId: string; shareUrl: string }>(
      '/v1/ai/share',
      input
    ),
};
