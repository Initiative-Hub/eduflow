import { apiClient } from '@/lib/api';
import type { ApiResponse } from '@/lib/api/types';
import type { IFile } from './types';

export const inventoryService = {
  upload: async (file: File): Promise<ApiResponse<IFile[]>> => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post<ApiResponse<IFile[]>>(
      'api/v1/inventory/upload',
      formData
    );
  },
};
