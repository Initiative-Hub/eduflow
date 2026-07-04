import type { UIMessage } from 'ai';
import { apiClient } from '@/lib/api';

export interface ChatHistoryPagination {
  hasMore: boolean;
  limit: number;
  nextCursor: string | null;
}

export interface ChatHistoryPageResponse<
  TMessage extends UIMessage = UIMessage,
> {
  guestId?: string;
  title: string;
  metadata?: unknown;
  messageCount: number;
  messages: TMessage[];
  pagination: ChatHistoryPagination;
  updatedAt?: string;
}

export interface ChatDetailsResponse {
  guestId?: string;
  title: string;
  metadata?: unknown;
  messageCount: number;
  messages: UIMessage[];
  pagination?: ChatHistoryPagination;
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
  getChat: async (
    chatId: string,
    params?: {
      limit?: number;
      before?: string;
    }
  ) => {
    return apiClient.get<ChatHistoryPageResponse>(`/v1/ai/chat/${chatId}`, {
      params,
    });
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
