import { useMutation } from '@tanstack/react-query';
import { ApiError } from 'next/dist/server/api-utils';
import { useLoadingStore } from '@/stores/useLoadingStore';
import { sanitizeUrl } from '@/utils/url-helper';
import { inventoryService } from './inventory.service';

export function useInventory() {
  const setLoading = useLoadingStore((state) => state.setLoading);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setLoading(true);
      const response = await inventoryService.upload(file);
    },
    onSuccess: (data) => {
      setLoading(false);
    },
    onError: () => {
      setLoading(false);
    },
  });

  return {
    upload: uploadMutation,
  };
}
