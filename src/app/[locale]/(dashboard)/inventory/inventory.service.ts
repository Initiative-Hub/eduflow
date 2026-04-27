import { apiClient } from '@/lib/api';
import type { ApiResponse } from '@/lib/api/types';
import type { InventoryFile } from './types';

export const inventoryService = {
  upload: async (file: File): Promise<ApiResponse<InventoryFile[]>> => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post<ApiResponse<InventoryFile[]>>(
      'api/v1/inventory/upload',
      formData
    );
  },
};
