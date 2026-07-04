import { apiClient } from '@/lib/api';
import type {
  StudyMode,
  StudyQuizOptions,
} from '@/lib/validations/study.schema';
import type {
  ChatHistoryPageResponse,
  ChatListResponse,
  ChatUpdateResponse,
} from '../(ai-chat)/chat.service';

export const studyService = {
  createChat: async (
    firstMessage: string,
    mode: StudyMode,
    quizOptions?: StudyQuizOptions
  ) => {
    return apiClient.post<{ chatId: string }>('/v1/ai/study/create', {
      firstMessage,
      mode,
      quizOptions,
    });
  },

  getChat: async (
    chatId: string,
    params?: {
      limit?: number;
      before?: string;
    }
  ) => {
    return apiClient.get<ChatHistoryPageResponse>(`/v1/ai/study/${chatId}`, {
      params,
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
