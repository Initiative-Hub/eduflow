import { apiClient } from '@/lib/api';
import type { SocraticDiscipline } from '@/lib/validations/socratic.schema';
import type {
  ChatDetailsResponse,
  ChatListResponse,
  ChatUpdateResponse,
} from '../(ai-chat)/chat.service';

export const socraticService = {
  createChat: async (firstMessage: string, discipline: SocraticDiscipline) => {
    return apiClient.post<{ chatId: string }>('/v1/ai/socratic/create', {
      firstMessage,
      discipline,
    });
  },
  getChat: async (chatId: string) => {
    return apiClient.get<ChatDetailsResponse>(`/v1/ai/socratic/${chatId}`);
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
