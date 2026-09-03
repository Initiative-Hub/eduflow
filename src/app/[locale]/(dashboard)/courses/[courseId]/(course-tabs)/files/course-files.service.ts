import axios from 'axios';
import type {
  InventoryAnalytics,
  InventoryBatchShareResult,
  InventoryEntry,
  InventoryListResponse,
  InventoryResponse,
  InventoryShareResult,
  InventoryUploadSession,
} from '@/app/[locale]/(dashboard)/inventory/inventory.types';
import { apiClient } from '@/lib/api';

interface ListParams {
  courseId: string;
  parentId?: string | null;
  search?: string;
  limit: number;
  offset: number;
}

interface CreateFolderInput {
  courseId: string;
  parentId?: string | null;
  name: string;
}

interface UploadInput {
  courseId: string;
  parentId?: string | null;
  file: File;
  onUploadStart?: (fileId: string) => void;
  onUploadProgress?: (fileId: string, progress: number) => void;
  onUploadComplete?: (fileId: string) => void;
}

interface UpdateEntryInput {
  name?: string;
  parentId?: string | null;
}

interface ShareBatchInput {
  fileIds: string[];
  expiresIn?: number;
}

interface ImportGoogleDriveInput {
  courseId: string;
  fileId: string;
  parentId?: string | null;
}

interface ImportOneDriveInput {
  courseId: string;
  driveId: string;
  itemId: string;
  parentId?: string | null;
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

export const courseFilesService = {
  list: async (params: ListParams): Promise<InventoryListResponse> => {
    const { courseId, ...rest } = params;
    const searchParams = buildSearchParams(rest);

    const queryString = searchParams.toString();
    return apiClient.get<InventoryListResponse>(
      `v1/courses/${courseId}/storage/list${queryString ? `?${queryString}` : ''}`
    );
  },

  analytics: async (
    courseId: string
  ): Promise<InventoryResponse<InventoryAnalytics>> => {
    return apiClient.get<InventoryResponse<InventoryAnalytics>>(
      `v1/courses/${courseId}/storage/analytics`
    );
  },

  createFolder: async (
    input: CreateFolderInput
  ): Promise<InventoryResponse<InventoryEntry>> => {
    return apiClient.post<InventoryResponse<InventoryEntry>>(
      `v1/courses/${input.courseId}/storage/folders`,
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
    >(`v1/courses/${input.courseId}/storage/init-upload`, {
      parentId: input.parentId ?? null,
      fileName: input.file.name,
      contentType: input.file.type || 'application/octet-stream',
      fileSize: input.file.size,
    });

    input.onUploadStart?.(response.data.fileId);

    await axios.put(response.data.uploadUrl, input.file, {
      headers: response.data.uploadHeaders,
      onUploadProgress: (event) => {
        if (!event.total) return;
        const progress = Math.min(
          100,
          Math.max(0, Math.round((event.loaded / event.total) * 100))
        );
        input.onUploadProgress?.(response.data.fileId, progress);
      },
    });

    input.onUploadComplete?.(response.data.fileId);

    return apiClient.post<InventoryResponse<InventoryEntry>>(
      `v1/courses/${input.courseId}/storage/confirm-upload`,
      {
        fileId: response.data.fileId,
      }
    );
  },

  importFromGoogleDrive: async (
    input: ImportGoogleDriveInput
  ): Promise<InventoryResponse<InventoryEntry>> => {
    return apiClient.post<InventoryResponse<InventoryEntry>>(
      `v1/courses/${input.courseId}/storage/import/google-drive`,
      {
        fileId: input.fileId,
        parentId: input.parentId ?? null,
      }
    );
  },

  importFromOneDrive: async (
    input: ImportOneDriveInput
  ): Promise<InventoryResponse<InventoryEntry>> => {
    return apiClient.post<InventoryResponse<InventoryEntry>>(
      `v1/courses/${input.courseId}/storage/import/onedrive`,
      {
        driveId: input.driveId,
        itemId: input.itemId,
        parentId: input.parentId ?? null,
      }
    );
  },

  updateEntry: async (
    courseId: string,
    fileId: string,
    input: UpdateEntryInput
  ): Promise<InventoryResponse<InventoryEntry>> => {
    return apiClient.patch<InventoryResponse<InventoryEntry>>(
      `v1/courses/${courseId}/storage/${fileId}`,
      input
    );
  },

  deleteEntries: async (
    courseId: string,
    fileIds: string[]
  ): Promise<InventoryResponse<{ deletedCount: number }>> => {
    return apiClient.delete<InventoryResponse<{ deletedCount: number }>>(
      `v1/courses/${courseId}/storage/delete`,
      {
        data: {
          fileIds,
        },
      }
    );
  },

  shareEntry: async (
    courseId: string,
    fileId: string
  ): Promise<InventoryResponse<InventoryShareResult>> => {
    return apiClient.get<InventoryResponse<InventoryShareResult>>(
      `v1/courses/${courseId}/storage/share?fileId=${fileId}`
    );
  },

  shareEntries: async (
    courseId: string,
    input: ShareBatchInput
  ): Promise<InventoryResponse<InventoryBatchShareResult[]>> => {
    return apiClient.post<InventoryResponse<InventoryBatchShareResult[]>>(
      `v1/courses/${courseId}/storage/share-batch`,
      input
    );
  },

  getDownloadPayload: (fileId: string) => `/api/v1/storage/download/${fileId}`,
};
