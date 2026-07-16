import { apiClient } from '@/lib/api';
import type { ShareResourceType } from '@/generated/prisma';
import type { ShareableAiChatType } from '@/lib/validations/ai-chat-share.schema';

export type SharedResourceLink = {
  id: string;
  title: string;
  createdAt: string;
  expiresAt: string | null;
  resourceType: ShareResourceType;
  shareUrl: string;
};

export const aiChatShareClient = {
  createShare: (input: { chatId: string; chatType: ShareableAiChatType }) =>
    apiClient.post<{ shareId: string; shareUrl: string }>(
      '/v1/ai/share',
      input
    ),

  listShares: () =>
    apiClient.get<{ data: SharedResourceLink[] }>('v1/ai/share', {
      headers: { 'Cache-Control': 'no-store' },
    }),

  revokeShare: (shareId: string) =>
    apiClient.delete<{ data: { revoked: boolean } }>(`v1/ai/share/${shareId}`),
};
