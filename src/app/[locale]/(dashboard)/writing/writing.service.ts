import { apiClient } from '@/lib/api';
import type {
  ChatListResponse,
  ChatUpdateResponse,
} from '../(ai-chat)/chat.service';

export const writingService = {
  createSession: async (firstMessage: string, tool: string) => {
    return apiClient.post<{ sessionId: string }>('/v1/ai/writing/create', {
      firstMessage,
      tool,
    });
  },
  updateSession: async (
    sessionId: string,
    data: { title?: string; deleted_at?: string }
  ) => {
    return apiClient.patch<ChatUpdateResponse>(
      `/v1/ai/writing/${sessionId}`,
      data
    );
  },
  listSessions: async ({
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
