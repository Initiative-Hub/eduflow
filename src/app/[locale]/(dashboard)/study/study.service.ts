import { limitShift } from '@floating-ui/react';
import { apiClient } from '@/lib/api';
import type {
  ChatListResponse,
  ChatUpdateResponse,
} from '../(ai-chat)/chat.service';

export const studyService = {
  createChat: async (firstMessage: string, mode: string) => {
    return apiClient.post<{ chatId: string }>('/v1/ai/study/create', {
      firstMessage,
      mode,
    });
  },

  updateChat: async (
    chatId: string,
    data: { title?: string; deleted_at?: string }
  ) => {
    return apiClient.patch<ChatUpdateResponse>(`/v1/ai/study/${chatId}`, data);
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
    return apiClient.get<ChatListResponse>('/v1/ai/study/list', {
      params: { search: search || undefined, limit, offset },
    });
  },
};
