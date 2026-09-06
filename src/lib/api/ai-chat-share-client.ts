import type { ShareResourceType } from '@/generated/prisma';
import { apiClient } from '@/lib/api';
import type { ShareableAiChatType } from '@/lib/validations/ai-chat-share.schema';

export type SharedResourceLink = {
  id: string;
  title: string;
  createdAt: string;
  resourceType: ShareResourceType;
  shareUrl: string;
};

export type SharedLinksPagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type SharedLinksResponse = {
  data: SharedResourceLink[];
  pagination: SharedLinksPagination;
};

export const aiChatShareClient = {
  createShare: (input: { chatId: string; chatType: ShareableAiChatType }) =>
    apiClient.post<{ shareId: string; shareUrl: string }>(
      '/v1/ai/share',
      input
    ),

  listShares: ({ page, pageSize }: { page: number; pageSize: number }) => {
    const searchParams = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });

    return apiClient.get<SharedLinksResponse>(
      `v1/ai/share?${searchParams.toString()}`,
      {
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  },

  revokeShare: (shareId: string) =>
    apiClient.delete<{ data: { revoked: boolean } }>(`v1/ai/share/${shareId}`),
};
