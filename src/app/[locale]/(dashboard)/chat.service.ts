import type { UIMessage } from 'ai';
import { apiClient } from '@/lib/api';

export interface ChatDetailsResponse {
  guestId: string;
  title: string;
  messageCount: number;
  messages: UIMessage[];
}

export const chatService = {
  createChat: async (firstMessage: string) => {
    return apiClient.post<{ chatId: string }>('/chat/create', {
      firstMessage,
    });
  },
  getChat: async (chatId: string) => {
    return apiClient.get<ChatDetailsResponse>(`/chat/${chatId}`);
  },
};
