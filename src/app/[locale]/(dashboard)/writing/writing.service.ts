import { apiClient } from '@/lib/api';
import type {
  ChatListResponse,
  ChatUpdateResponse,
} from '../(ai-chat)/chat.service';

export const writingService = {
  createChat: async (firstMessage: string, tool: string) => {
    return apiClient.post<{ chatId: string }>('/v1/ai/writing/create', {
      firstMessage,
      tool,
    });
  },
  updateChat: async (
    chatId: string,
    data: { title?: string; deleted_at?: string }
  ) => {
    return apiClient.patch<ChatUpdateResponse>(
      `/v1/ai/writing/${chatId}`,
      data
    );
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
    return apiClient.get<ChatListResponse>('/v1/ai/writing/list', {
      params: { search: search || undefined, limit, offset },
    });
  },
};
