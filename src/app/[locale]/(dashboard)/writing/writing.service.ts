import { apiClient } from '@/lib/api';

export const writingService = {
  createSession: async (firstMessage: string, tool: string) => {
    //TODO: CREATE THIS ROUTE
    return apiClient.post<{ sessionId: string }>('/writing/create', {
      firstMessage,
      tool,
    });
  },
};
