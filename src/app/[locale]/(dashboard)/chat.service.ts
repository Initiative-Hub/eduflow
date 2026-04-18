import { apiClient } from '@/lib/api';

export const chatService = {
  createChat: async (firstMessage: string) => {
    return apiClient.post<{ chatId: string }>('/chat/create', {
      firstMessage,
    });
  },
  sendMessage: async (chatId: string, text: string) => {
    return apiClient.post(`/chat/${chatId}/message`, {
      text,
    });
  },
  getMessages: async (chatId: string) => {
    return apiClient.get(`/chat/${chatId}/messages`);
  },
};
