import { apiClient } from '@/lib/api';

export const writingService = {
  createSession: async (firstMessage: string, tool: string) => {
    return apiClient.post<{ sessionId: string }>('/v1/ai/writing/create', {
      firstMessage,
      tool,
    });
  },
};
