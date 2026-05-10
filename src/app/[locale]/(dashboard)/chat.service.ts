import type { UIMessage } from 'ai';
import { apiClient } from '@/lib/api';

export interface ChatDetailsResponse {
  guestId?: string;
  title: string;
  messageCount: number;
  messages: UIMessage[];
}

export interface ChatListItemResponse {
  id: string;
  title: string;
  messageCount: number;
  updatedAt: string;
}

export interface ChatListResponse {
  data: ChatListItemResponse[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

export interface ChatUpdateResponse {
  id: string;
  title: string;
  updatedAt: string;
  deletedAt: string | null;
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
  updateChat: async (
    chatId: string,
    data: { title?: string; deleted_at?: string }
  ) => {
    return apiClient.patch<ChatUpdateResponse>(`/chat/${chatId}`, data);
  },
  listChats: async ({
    search,
    limit,
    offset,
  }: {
    search?: string;
    limit: number;
    offset: number;
  }) => {
    return apiClient.get<ChatListResponse>('/chat/list', {
      params: { search: search || undefined, limit, offset },
    });
  },
};
