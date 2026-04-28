import { apiClient } from '@/lib/api';
import type {
  InventoryAnalytics,
  InventoryBatchShareResult,
  InventoryEntry,
  InventoryListResponse,
  InventoryResponse,
  InventoryShareResult,
  InventoryUploadSession,
} from './types';

interface ListParams {
  parentId?: string | null;
  search?: string;
  limit: number;
  offset: number;
}

interface CreateFolderInput {
  parentId?: string | null;
  name: string;
}

interface UploadInput {
  parentId?: string | null;
  file: File;
}

interface UpdateEntryInput {
  name?: string;
  parentId?: string | null;
}

interface ShareBatchInput {
  fileIds: string[];
  expiresIn?: number;
}

const buildSearchParams = (
  params: Record<string, string | number | null | undefined>
) => {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === '') continue;
    searchParams.set(key, String(value));
  }

  return searchParams;
};

export const inventoryService = {
  list: async (params: ListParams): Promise<InventoryListResponse> => {
    const searchParams = buildSearchParams({
      parentId: params.parentId,
      search: params.search,
      limit: params.limit,
      offset: params.offset,
    });

    const queryString = searchParams.toString();
    return apiClient.get<InventoryListResponse>(
      `v1/storage/list${queryString ? `?${queryString}` : ''}`
    );
  },

  analytics: async (): Promise<InventoryResponse<InventoryAnalytics>> => {
    return apiClient.get<InventoryResponse<InventoryAnalytics>>(
      'v1/storage/analytics'
    );
  },

  createFolder: async (
    input: CreateFolderInput
  ): Promise<InventoryResponse<InventoryEntry>> => {
    return apiClient.post<InventoryResponse<InventoryEntry>>(
      'v1/storage/folders',
      {
        parentId: input.parentId ?? null,
        name: input.name,
      }
    );
  },

  upload: async (
    input: UploadInput
  ): Promise<InventoryResponse<InventoryEntry>> => {
    const response = await apiClient.post<
      InventoryResponse<InventoryUploadSession>
    >('v1/storage/init-upload', {
      parentId: input.parentId ?? null,
      fileName: input.file.name,
      contentType: input.file.type || 'application/octet-stream',
      size: input.file.size,
    });

    await fetch(response.data.uploadUrl, {
      method: 'PUT',
      headers: response.data.uploadHeaders,
      body: input.file,
    });

    return apiClient.post<InventoryResponse<InventoryEntry>>(
      'v1/storage/confirm-upload',
      {
        fileId: response.data.fileId,
      }
    );
  },

  updateEntry: async (
    fileId: string,
    input: UpdateEntryInput
  ): Promise<InventoryResponse<InventoryEntry>> => {
    return apiClient.patch<InventoryResponse<InventoryEntry>>(
      `v1/storage/${fileId}`,
      input
    );
  },

  deleteEntries: async (
    fileIds: string[]
  ): Promise<InventoryResponse<{ deletedCount: number }>> => {
    return apiClient.delete<InventoryResponse<{ deletedCount: number }>>(
      'v1/storage/delete',
      {
        data: {
          fileIds,
        },
      }
    );
  },

  shareEntry: async (
    fileId: string
  ): Promise<InventoryResponse<InventoryShareResult>> => {
    return apiClient.get<InventoryResponse<InventoryShareResult>>(
      `v1/storage/share?fileId=${fileId}`
    );
  },

  shareEntries: async (
    input: ShareBatchInput
  ): Promise<InventoryResponse<InventoryBatchShareResult[]>> => {
    return apiClient.post<InventoryResponse<InventoryBatchShareResult[]>>(
      'v1/storage/share-batch',
      input
    );
  },

  getDownloadUrl: (fileId: string) => `/api/v1/storage/download/${fileId}`,
};
