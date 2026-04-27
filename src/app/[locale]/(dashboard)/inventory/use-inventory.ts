import { useMutation } from '@tanstack/react-query';
import { useLoadingStore } from '@/stores/useLoadingStore';
import { inventoryService } from './inventory.service';

export function useInventory() {
  const setLoading = useLoadingStore((state) => state.setLoading);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setLoading(true);
      const response = await inventoryService.upload(file);
      return response;
    },
    onSuccess: (_data) => {
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
