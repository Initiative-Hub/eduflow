export const STORAGE_PAGE_SIZE = 24;
export const STORAGE_LIMIT_BYTES = 5 * 1024 * 1024 * 1024;
export const STORAGE_MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

export type InventoryEntryStatus = 'READY' | 'UPLOADING' | 'DELETED' | string;

export type InventoryTranslations = ReturnType<
  typeof import('next-intl').useTranslations
>;

export interface InventoryEntry {
  id: string;
  userId: string;
  parentId: string | null;
  name: string;
  isFolder: boolean;
  metadata: Record<string, unknown> | null;
  status: InventoryEntryStatus;
  fileSize: number | null;
  mimeType: string | null;
  extension: string | null;
  bucket: string | null;
  objectKey: string | null;
  checksumSha256: string | null;
  vectorDbId: string | null;
  createdAt: string;
  updatedAt: string;
  uploadedAt: string;
  deletedAt: string | null;
}

export interface InventoryListPagination {
  total: number;
  limit: number;
  offset: number;
}

export interface InventoryListResponse {
  data: InventoryEntry[];
  pagination: InventoryListPagination;
}

export interface InventoryResponse<T> {
  data: T;
}

export interface InventoryUploadSession {
  fileId: string;
  path: string;
  bucket: string;
  status: string;
  uploadUrl: string;
  uploadHeaders: Record<string, string>;
}

export interface InventoryAnalytics {
  fileCount: number;
  folderCount: number;
  totalSizeBytes: number;
}

export interface InventoryShareResult {
  signedUrl: string;
}

export interface InventoryBatchShareResult {
  fileId: string;
  name: string;
  signedUrl: string;
}

export interface InventoryBreadcrumb {
  id: string;
  name: string;
}

export interface InventoryPreviewState {
  entry: InventoryEntry;
  url: string;
  mimeType: string | null;
}

export interface InventoryMoveOption {
  id: string | null;
  name: string;
}
