import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useDeferredValue, useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { ApiError } from '@/lib/api/types';
import { inventoryService } from './inventory.service';
import {
  type InventoryBreadcrumb,
  type InventoryEntry,
  type InventoryMoveOption,
  type InventoryPreviewState,
  STORAGE_PAGE_SIZE,
} from './inventory.types';
import { formatFileSize } from './inventory.utils';
import { getInventoryErrorMessage } from './inventory-error-message';

const INVENTORY_QUERY_KEY = ['inventory'] as const;
const INVENTORY_LIST_QUERY_KEY = [...INVENTORY_QUERY_KEY, 'list'] as const;
const INVENTORY_ANALYTICS_QUERY_KEY = [
  ...INVENTORY_QUERY_KEY,
  'analytics',
] as const;

async function copyToClipboard(value: string) {
  if (!navigator.clipboard?.writeText) {
    throw new Error('Clipboard is not available');
  }

  await navigator.clipboard.writeText(value);
}

export function useInventory({
  maxFileSizeBytes,
}: {
  maxFileSizeBytes: number;
}) {
  const t = useTranslations('InventoryPage');
  const queryClient = useQueryClient();

  const [viewType, setViewType] = useState<'grid' | 'list'>('grid');
  const [search, setSearchState] = useState('');
  const [pageIndex, setPageIndexState] = useState(0);
  const [folderTrail, setFolderTrail] = useState<InventoryBreadcrumb[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [renameDialog, setRenameDialog] = useState<{
    open: boolean;
    entry: InventoryEntry | null;
    value: string;
  }>({
    open: false,
    entry: null,
    value: '',
  });
  const [moveDialog, setMoveDialog] = useState<{
    open: boolean;
    entry: InventoryEntry | null;
    parentId: string | null;
  }>({
    open: false,
    entry: null,
    parentId: null,
  });
  const [createFolderDialog, setCreateFolderDialog] = useState<{
    open: boolean;
    value: string;
  }>({
    open: false,
    value: '',
  });
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    entries: InventoryEntry[];
  }>({
    open: false,
    entries: [],
  });
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadProgressById, setUploadProgressById] = useState<
    Record<string, number>
  >({});
  const [optimisticEntries, setOptimisticEntries] = useState<InventoryEntry[]>(
    []
  );
  const [previewDialog, setPreviewDialog] =
    useState<InventoryPreviewState | null>(null);

  const deferredSearch = useDeferredValue(search.trim());
  const currentFolder = folderTrail.at(-1) ?? null;
  const currentFolderId = currentFolder?.id ?? null;

  const listQuery = useQuery({
    queryKey: [
      ...INVENTORY_LIST_QUERY_KEY,
      currentFolderId ?? 'root',
      deferredSearch,
      pageIndex,
    ],
    queryFn: () =>
      inventoryService.list({
        parentId: currentFolderId,
        search: deferredSearch || undefined,
        limit: STORAGE_PAGE_SIZE,
        offset: pageIndex * STORAGE_PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  });

  const analyticsQuery = useQuery({
    queryKey: INVENTORY_ANALYTICS_QUERY_KEY,
    queryFn: inventoryService.analytics,
    placeholderData: keepPreviousData,
  });

  const serverEntries = listQuery.data?.data ?? [];
  const entries = useMemo(() => {
    const serverIds = new Set(serverEntries.map((entry) => entry.id));
    const activeOptimistic = optimisticEntries.filter(
      (entry) => !serverIds.has(entry.id)
    );
    return [...activeOptimistic, ...serverEntries];
  }, [serverEntries, optimisticEntries]);
  const listPagination = useMemo(() => {
    if (!listQuery.data?.pagination) return undefined;
    const serverIds = new Set(serverEntries.map((entry) => entry.id));
    const activeOptimisticCount = optimisticEntries.filter(
      (entry) => !serverIds.has(entry.id)
    ).length;
    return {
      ...listQuery.data.pagination,
      total: listQuery.data.pagination.total + activeOptimisticCount,
    };
  }, [listQuery.data?.pagination, serverEntries, optimisticEntries]);
  const folders = useMemo(
    () => entries.filter((entry) => entry.isFolder),
    [entries]
  );
  const files = useMemo(
    () => entries.filter((entry) => !entry.isFolder),
    [entries]
  );
  const selectedEntries = useMemo(
    () => entries.filter((entry) => selectedIds.includes(entry.id)),
    [entries, selectedIds]
  );
  const selectedFiles = useMemo(
    () => selectedEntries.filter((entry) => !entry.isFolder),
    [selectedEntries]
  );
  const selectedFolders = useMemo(
    () => selectedEntries.filter((entry) => entry.isFolder),
    [selectedEntries]
  );
  const breadcrumbItems = useMemo(
    () => [{ id: 'root', name: t('breadcrumbs.root') }, ...folderTrail],
    [folderTrail, t]
  );
  const currentPathLabel = useMemo(
    () => breadcrumbItems.map((item) => item.name).join(' / '),
    [breadcrumbItems]
  );
  const moveOptions = useMemo<InventoryMoveOption[]>(() => {
    const options: InventoryMoveOption[] = [
      { id: null, name: t('breadcrumbs.root') },
    ];

    folderTrail.forEach((folder, index) => {
      options.push({
        id: folder.id,
        name: [
          t('breadcrumbs.root'),
          ...folderTrail.slice(0, index + 1).map((item) => item.name),
        ].join(' / '),
      });
    });

    folders.forEach((folder) => {
      options.push({
        id: folder.id,
        name: currentPathLabel
          ? `${currentPathLabel} / ${folder.name}`
          : folder.name,
      });
    });

    return options.filter(
      (option, index, array) =>
        array.findIndex((candidate) => candidate.id === option.id) === index
    );
  }, [currentPathLabel, folderTrail, folders, t]);

  const createFolderMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await inventoryService.createFolder({
        parentId: currentFolderId,
        name,
      });

      return response.data;
    },
    onSuccess: async (entry) => {
      await queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEY });
      setCreateFolderDialog({ open: false, value: '' });
      setSelectedIds([]);
      toast.success(t('toast.folderCreated'), {
        description: entry.name,
      });
    },
    onError: (error: ApiError) => {
      toast.error(getInventoryErrorMessage(error, t));
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, tempId }: { file: File; tempId: string }) => {
      let uploadFileId: string | null = null;

      try {
        const response = await inventoryService.upload({
          parentId: currentFolderId,
          file,
          onUploadStart: (fileId) => {
            uploadFileId = fileId;
            setOptimisticEntries((curr) =>
              curr.map((entry) =>
                entry.id === tempId ? { ...entry, id: fileId } : entry
              )
            );
            setUploadProgressById((current) => ({
              ...current,
              [fileId]: current[tempId] ?? 0,
            }));
          },
          onUploadProgress: (fileId, progress) => {
            setUploadProgressById((current) => ({
              ...current,
              [tempId]: progress,
              [fileId]: progress,
            }));
          },
          onUploadComplete: (fileId) => {
            setUploadProgressById((current) => ({
              ...current,
              [tempId]: 100,
              [fileId]: 100,
            }));
          },
        });

        return response.data;
      } catch (error) {
        if (uploadFileId) {
          const failedUploadFileId = uploadFileId;
          inventoryService.deleteEntries([failedUploadFileId]).catch(() => {});
          setUploadProgressById((current) => {
            const next = { ...current };
            delete next[failedUploadFileId];
            return next;
          });
        }

        throw error;
      }
    },
    onSuccess: async (entry, variables) => {
      setOptimisticEntries((current) =>
        current.filter(
          (item) =>
            item.id !== variables.tempId &&
            item.metadata?.tempId !== variables.tempId &&
            item.id !== entry.id
        )
      );
      setUploadProgressById((current) => {
        const next = { ...current };
        delete next[variables.tempId];
        delete next[entry.id];
        return next;
      });

      await queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEY });
      setUploadOpen(false);
      setSelectedIds([]);
      toast.success(t('toast.uploaded'), {
        description: entry.name,
      });
    },
    onError: (error: ApiError, variables) => {
      setOptimisticEntries((current) =>
        current.filter(
          (item) =>
            item.id !== variables.tempId &&
            item.metadata?.tempId !== variables.tempId
        )
      );
      setUploadProgressById((current) => {
        const next = { ...current };
        delete next[variables.tempId];
        return next;
      });

      toast.error(getInventoryErrorMessage(error, t));
    },
  });

  const googleDriveImportMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const response = await inventoryService.importFromGoogleDrive({
        fileId,
        parentId: currentFolderId,
      });

      return response.data;
    },
    onError: (error: ApiError) => {
      toast.error(getInventoryErrorMessage(error, t));
    },
    onSuccess: async (entry) => {
      await queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEY });
      setUploadOpen(false);
      setSelectedIds([]);
      toast.success(t('toast.googleDriveImported'), {
        description: entry.name,
      });
    },
  });

  const oneDriveImportMutation = useMutation({
    mutationFn: async (item: { driveId: string; itemId: string }) => {
      const response = await inventoryService.importFromOneDrive({
        driveId: item.driveId,
        itemId: item.itemId,
        parentId: currentFolderId,
      });

      return response.data;
    },
    onError: (error: ApiError) => {
      toast.error(getInventoryErrorMessage(error, t));
    },
    onSuccess: async (entry) => {
      await queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEY });
      setUploadOpen(false);
      setSelectedIds([]);
      toast.success(t('toast.oneDriveImported'), {
        description: entry.name,
      });
    },
  });

  const renameMutation = useMutation({
    mutationFn: async ({ fileId, name }: { fileId: string; name: string }) => {
      const response = await inventoryService.updateEntry(fileId, { name });
      return response.data;
    },
    onSuccess: async (entry) => {
      await queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEY });
      setRenameDialog({ open: false, entry: null, value: '' });
      setSelectedIds([]);
      toast.success(t('toast.renamed'), {
        description: entry.name,
      });
    },
    onError: (error: ApiError) => {
      toast.error(getInventoryErrorMessage(error, t));
    },
  });

  const moveMutation = useMutation({
    mutationFn: async ({
      fileId,
      parentId,
    }: {
      fileId: string;
      parentId: string | null;
    }) => {
      const response = await inventoryService.updateEntry(fileId, { parentId });
      return response.data;
    },
    onSuccess: async (entry) => {
      await queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEY });
      setMoveDialog({ open: false, entry: null, parentId: null });
      setSelectedIds([]);
      toast.success(t('toast.moved'), {
        description: entry.name,
      });
    },
    onError: (error: ApiError) => {
      toast.error(getInventoryErrorMessage(error, t));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (fileIds: string[]) => {
      const response = await inventoryService.deleteEntries(fileIds);
      return response.data;
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEY });
      setDeleteDialog({ open: false, entries: [] });
      setSelectedIds([]);
      toast.success(t('toast.deleted', { count: result.deletedCount }));
    },
    onError: (error: ApiError) => {
      toast.error(getInventoryErrorMessage(error, t));
    },
  });

  const handleSearchChange = (value: string) => {
    setSearchState(value);
    setPageIndexState(0);
    setSelectedIds([]);
  };

  const handleViewTypeChange = (nextViewType: 'grid' | 'list') => {
    setViewType(nextViewType);
    setSelectedIds([]);
  };

  const handlePageChange = (nextPage: number) => {
    setPageIndexState(nextPage);
    setSelectedIds([]);
  };

  const handleNavigateIntoFolder = (folder: InventoryEntry) => {
    if (!folder.isFolder) return;

    setFolderTrail((trail) => [...trail, { id: folder.id, name: folder.name }]);
    setSearchState('');
    setPageIndexState(0);
    setSelectedIds([]);
  };

  const handleGoToBreadcrumb = (index: number) => {
    if (index <= 0) {
      setFolderTrail([]);
    } else {
      setFolderTrail((trail) => trail.slice(0, index));
    }

    setSearchState('');
    setPageIndexState(0);
    setSelectedIds([]);
  };

  const handleSelectEntry = (entryId: string, checked: boolean) => {
    setSelectedIds((current) => {
      if (checked) {
        return current.includes(entryId) ? current : [...current, entryId];
      }

      return current.filter((id) => id !== entryId);
    });
  };

  const handleSelectSingleEntry = (entryId: string) => {
    setSelectedIds([entryId]);
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? entries.map((entry) => entry.id) : []);
  };

  const handleOpenRenameDialog = (entry: InventoryEntry) => {
    setRenameDialog({ open: true, entry, value: entry.name });
  };

  const handleOpenMoveDialog = (entry: InventoryEntry) => {
    setMoveDialog({
      open: true,
      entry,
      parentId: entry.parentId,
    });
  };

  const handleRequestDelete = (items: InventoryEntry[]) => {
    if (items.length === 0) return;

    setDeleteDialog({ open: true, entries: items });
  };

  const handleRenameSubmit = () => {
    if (!renameDialog.entry) return;

    const nextName = renameDialog.value.trim();
    if (!nextName) return;

    renameMutation.mutate({
      fileId: renameDialog.entry.id,
      name: nextName,
    });
  };

  const handleMoveSubmit = () => {
    if (!moveDialog.entry) return;

    moveMutation.mutate({
      fileId: moveDialog.entry.id,
      parentId: moveDialog.parentId,
    });
  };

  const handleDeleteConfirm = () => {
    deleteMutation.mutate(deleteDialog.entries.map((entry) => entry.id));
  };

  const getUploadProgress = (entryId: string) => {
    return uploadProgressById[entryId];
  };

  const handleCreateFolderSubmit = () => {
    const nextName = createFolderDialog.value.trim();
    if (!nextName) return;

    createFolderMutation.mutate(nextName);
  };

  const handleUploadFiles = (filesToUpload: File[]) => {
    const file = filesToUpload[0];
    if (!file) return;

    if (file.size > maxFileSizeBytes) {
      toast.error(
        t('toast.fileTooLarge', {
          size: formatFileSize(maxFileSizeBytes),
        })
      );
      return;
    }

    const tempId = `optimistic-${crypto.randomUUID()}`;
    const optimisticEntry: InventoryEntry = {
      id: tempId,
      userId: '',
      parentId: currentFolderId,
      name: file.name,
      isFolder: false,
      metadata: { tempId },
      status: 'UPLOADING',
      fileSize: file.size,
      mimeType: file.type || 'application/octet-stream',
      extension: file.name.includes('.')
        ? (file.name.split('.').pop() ?? null)
        : null,
      bucket: null,
      objectKey: null,
      checksumSha256: null,
      vectorDbId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      uploadedAt: new Date().toISOString(),
      deletedAt: null,
      thumbnailObjectKey: null,
      thumbnailMimeType: null,
      thumbnailUrl: file.type.startsWith('image/')
        ? URL.createObjectURL(file)
        : null,
    };

    setOptimisticEntries((curr) => [optimisticEntry, ...curr]);
    setUploadProgressById((curr) => ({ ...curr, [tempId]: 0 }));
    setUploadOpen(false);

    uploadMutation.mutate({ file, tempId });
  };

  const handleImportGoogleDriveFile = (fileId: string) => {
    googleDriveImportMutation.mutate(fileId);
  };

  const handleImportOneDriveFile = (item: {
    driveId: string;
    itemId: string;
  }) => {
    oneDriveImportMutation.mutate(item);
  };

  const handlePreviewEntry = async (entry: InventoryEntry) => {
    try {
      const response = await inventoryService.shareEntry(entry.id);

      setPreviewDialog({
        entry,
        url: response.data.signedUrl,
        mimeType: entry.mimeType,
      });
    } catch (error) {
      toast.error(
        getInventoryErrorMessage(error, t, t('toast.previewUnavailable'))
      );
    }
  };

  const handleOpenEntry = (entry: InventoryEntry) => {
    if (entry.isFolder) {
      handleNavigateIntoFolder(entry);
      return;
    }

    handlePreviewEntry(entry);
  };

  const closePreview = () => {
    setPreviewDialog(null);
  };

  const handleShareEntry = async (entry: InventoryEntry) => {
    if (entry.isFolder) {
      toast.error(t('toast.shareFoldersUnsupported'));
      return;
    }

    try {
      const response = await inventoryService.shareEntry(entry.id);
      await copyToClipboard(response.data.signedUrl);
      toast.success(t('toast.shareCopied'), {
        description: entry.name,
      });
    } catch (error) {
      toast.error(getInventoryErrorMessage(error, t));
    }
  };

  const handleShareSelected = async () => {
    if (selectedFiles.length === 0) {
      toast.error(t('toast.shareFilesOnly'));
      return;
    }

    try {
      const response = await inventoryService.shareEntries({
        fileIds: selectedFiles.map((entry) => entry.id),
      });

      await copyToClipboard(
        response.data.map((item) => item.signedUrl).join('\n\n')
      );

      toast.success(t('toast.shareCopied'), {
        description: t('toast.shareBatchDescription', {
          count: response.data.length,
        }),
      });
    } catch (error) {
      toast.error(getInventoryErrorMessage(error, t));
    }
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEY });
  };

  return {
    analytics: analyticsQuery.data?.data,
    breadcrumbItems,
    closePreview,
    createFolderDialog,
    createFolderPending: createFolderMutation.isPending,
    currentFolderId,
    currentPathLabel,
    deleteDialog,
    deletePending: deleteMutation.isPending,
    entries,
    files,
    folders,
    getUploadProgress,
    handleCreateFolderSubmit,
    handleDeleteConfirm,
    handleGoToBreadcrumb,
    handleUploadFiles,
    handleImportGoogleDriveFile,
    handleImportOneDriveFile,
    handleMoveSubmit,
    handleNavigateIntoFolder,
    handleOpenEntry,
    handleOpenMoveDialog,
    handleOpenRenameDialog,
    handlePageChange,
    handlePreviewEntry,
    handleRefresh,
    handleRequestDelete,
    handleRenameSubmit,
    handleSearchChange,
    handleSelectAll,
    handleSelectEntry,
    handleSelectSingleEntry,
    handleShareEntry,
    handleShareSelected,
    isFetching: listQuery.isFetching,
    isLoading: listQuery.isLoading || analyticsQuery.isLoading,
    listPagination,
    loadError: listQuery.error ?? analyticsQuery.error,
    maxFileSizeBytes,
    moveDialog,
    moveOptions,
    movePending: moveMutation.isPending,
    pageIndex,
    previewDialog,
    renameDialog,
    renamePending: renameMutation.isPending,
    search,
    selectedEntries,
    selectedFiles,
    selectedFolders,
    selectedIds,
    setCreateFolderDialog,
    setDeleteDialog,
    setMoveDialog,
    setPreviewDialog,
    setRenameDialog,
    setUploadOpen,
    setViewType: handleViewTypeChange,
    toggleSelection: handleSelectEntry,
    uploadOpen,
    uploadPending: uploadMutation.isPending,
    googleDriveImportPending: googleDriveImportMutation.isPending,
    oneDriveImportPending: oneDriveImportMutation.isPending,
    viewType,
  };
}
