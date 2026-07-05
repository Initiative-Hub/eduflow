import { apiClient } from '@/lib/api';
import type {
  ChatHistoryPageResponse,
  ChatListResponse,
  ChatUpdateResponse,
} from '../(ai-chat)/chat.service';
import type { SocraticUIMessage } from '@/types/socratic-ui-message';

export const socraticService = {
  createChat: async (firstMessage: string) => {
    return apiClient.post<{ chatId: string }>('/v1/ai/socratic/create', {
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
    return apiClient.get<ChatHistoryPageResponse<SocraticUIMessage>>(
      `/v1/ai/socratic/${chatId}`,
      {
        params,
      }
    );
  },
  updateChat: async (
    chatId: string,
    data: { title?: string; deleted_at?: string }
  ) => {
    return apiClient.patch<ChatUpdateResponse>(
      `/v1/ai/socratic/${chatId}`,
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
    return apiClient.get<ChatListResponse>('/v1/ai/socratic/list', {
      params: { search: search || undefined, limit, offset },
    });
  },
};
