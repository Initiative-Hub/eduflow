import type { UIMessage } from 'ai';
import { apiClient } from '@/lib/api';

export interface ChatDetailsResponse {
  guestId?: string;
  title: string;
  metadata?: unknown;
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
    return apiClient.post<{ chatId: string }>('/v1/ai/chat/create', {
      firstMessage,
    });
  },
  getChat: async (chatId: string) => {
    return apiClient.get<ChatDetailsResponse>(`/v1/ai/chat/${chatId}`);
  },
  updateChat: async (
    chatId: string,
    data: { title?: string; deleted_at?: string }
  ) => {
    return apiClient.patch<ChatUpdateResponse>(`/v1/ai/chat/${chatId}`, data);
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
    return apiClient.get<ChatListResponse>('/v1/ai/chat/list', {
      params: { search: search || undefined, limit, offset },
    });
  },
};
