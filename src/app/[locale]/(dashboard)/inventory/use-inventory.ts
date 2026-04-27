import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useLoadingStore } from '@/stores/useLoadingStore';
import {
  type StorageFile,
  type StorageFolder,
  useStorageStore,
} from '@/stores/useStorageStore';
import { inventoryService } from './inventory.service';

export function useInventory(
  initialFiles: StorageFile[],
  initialFolders: Record<string, StorageFolder>
) {
  const setLoading = useLoadingStore((state) => state.setLoading);
  const { files, deleteFile, renameFile, initStore } = useStorageStore();

  const [viewType, setViewType] = useState<'grid' | 'list'>('grid');
  const [renameDialog, setRenameDialog] = useState<{
    open: boolean;
    fileId: string | null;
    value: string;
  }>({
    open: false,
    fileId: null,
    value: '',
  });

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

  const handleDelete = (id: string) => {
    deleteFile(id);
  };

  const handleRename = (id: string, newName: string) => {
    renameFile(id, newName);
  };

  const handleRenameClick = (id: string) => {
    const file = files.find((item) => item.id === id);
    setRenameDialog({
      open: true,
      fileId: id,
      value: file?.name ?? '',
    });
  };

  const handleRenameSubmit = () => {
    if (!renameDialog.fileId) return;
    const nextName = renameDialog.value.trim();
    if (!nextName) return;
    handleRename(renameDialog.fileId, nextName);
    setRenameDialog({ open: false, fileId: null, value: '' });
  };

  const handleMove = (_id: string) => {};
  const handleShare = (_id: string) => {};
  const handlePreview = (_file: StorageFile) => {};

  useEffect(() => {
    initStore({
      files: initialFiles,
      folders: initialFolders,
    });
  }, [initStore, initialFiles, initialFolders]);

  return {
    upload: uploadMutation,
    files,
    viewType,
    renameDialog,
    setViewType,
    setRenameDialog,
    handleDelete,
    handleRename,
    handleRenameClick,
    handleRenameSubmit,
    handleMove,
    handleShare,
    handlePreview,
  };
}
