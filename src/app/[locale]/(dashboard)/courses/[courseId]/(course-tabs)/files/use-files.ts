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
import { courseFilesService } from './course-files.service';
import {
  type InventoryBreadcrumb,
  type InventoryEntry,
  type InventoryMoveOption,
  type InventoryPreviewState,
  STORAGE_PAGE_SIZE,
} from '@/app/[locale]/(dashboard)/inventory/inventory.types';
import { formatFileSize } from '@/app/[locale]/(dashboard)/inventory/inventory.utils';

const COURSE_FILES_QUERY_KEY = ['course-files'] as const;

function getErrorMessage(error: unknown, fallback: string) {
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }

  return fallback;
}

async function copyToClipboard(value: string) {
  if (!navigator.clipboard?.writeText) {
    throw new Error('Clipboard is not available');
  }

  await navigator.clipboard.writeText(value);
}

export function useFiles({
  courseId,
  maxFileSizeBytes,
}: {
  courseId: string;
  maxFileSizeBytes: number;
}) {
  const t = useTranslations('InventoryPage'); // Reusing inventory translations for now
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
  const [previewDialog, setPreviewDialog] =
    useState<InventoryPreviewState | null>(null);

  const deferredSearch = useDeferredValue(search.trim());
  const currentFolder = folderTrail.at(-1) ?? null;
  const currentFolderId = currentFolder?.id ?? null;

  const listQuery = useQuery({
    queryKey: [
      ...COURSE_FILES_QUERY_KEY,
      courseId,
      'list',
      currentFolderId ?? 'root',
      deferredSearch,
      pageIndex,
    ],
    queryFn: () =>
      courseFilesService.list({
        courseId,
        parentId: currentFolderId,
        search: deferredSearch || undefined,
        limit: STORAGE_PAGE_SIZE,
        offset: pageIndex * STORAGE_PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  });

  const analyticsQuery = useQuery({
    queryKey: [...COURSE_FILES_QUERY_KEY, courseId, 'analytics'],
    queryFn: () => courseFilesService.analytics(courseId),
    placeholderData: keepPreviousData,
  });

  const entries = listQuery.data?.data ?? [];
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
      const response = await courseFilesService.createFolder({
        courseId,
        parentId: currentFolderId,
        name,
      });

      return response.data;
    },
    onSuccess: async (entry) => {
      await queryClient.invalidateQueries({ queryKey: COURSE_FILES_QUERY_KEY });
      setCreateFolderDialog({ open: false, value: '' });
      setSelectedIds([]);
      toast.success(t('toast.folderCreated'), {
        description: entry.name,
      });
    },
    onError: (error: ApiError) => {
      toast.error(getErrorMessage(error, t('toast.genericError')));
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      let uploadFileId: string | null = null;

      try {
        const response = await courseFilesService.upload({
          courseId,
          parentId: currentFolderId,
          file,
          onUploadStart: (fileId) => {
            uploadFileId = fileId;
            queryClient.invalidateQueries({ queryKey: COURSE_FILES_QUERY_KEY });
            setUploadProgressById((current) => ({
              ...current,
              [fileId]: 0,
            }));
          },
          onUploadProgress: (fileId, progress) => {
            setUploadProgressById((current) => ({
              ...current,
              [fileId]: progress,
            }));
          },
          onUploadComplete: (fileId) => {
            setUploadProgressById((current) => ({
              ...current,
              [fileId]: 100,
            }));
          },
        });

        if (uploadFileId) {
          const completedUploadFileId = uploadFileId;
          setUploadProgressById((current) => {
            const next = { ...current };
            delete next[completedUploadFileId];
            return next;
          });
        }

        return response.data;
      } catch (error) {
        if (uploadFileId) {
          const failedUploadFileId = uploadFileId;
          setUploadProgressById((current) => {
            const next = { ...current };
            delete next[failedUploadFileId];
            return next;
          });
        }

        throw error;
      }
    },
    onSuccess: async (entry) => {
      await queryClient.invalidateQueries({ queryKey: COURSE_FILES_QUERY_KEY });
      setUploadOpen(false);
      setSelectedIds([]);
      toast.success(t('toast.uploaded'), {
        description: entry.name,
      });
    },
    onError: (error: ApiError) => {
      toast.error(getErrorMessage(error, t('toast.genericError')));
    },
  });

  const renameMutation = useMutation({
    mutationFn: async ({ fileId, name }: { fileId: string; name: string }) => {
      const response = await courseFilesService.updateEntry(courseId, fileId, {
        name,
      });
      return response.data;
    },
    onSuccess: async (entry) => {
      await queryClient.invalidateQueries({ queryKey: COURSE_FILES_QUERY_KEY });
      setRenameDialog({ open: false, entry: null, value: '' });
      setSelectedIds([]);
      toast.success(t('toast.renamed'), {
        description: entry.name,
      });
    },
    onError: (error: ApiError) => {
      toast.error(getErrorMessage(error, t('toast.genericError')));
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
      const response = await courseFilesService.updateEntry(courseId, fileId, {
        parentId,
      });
      return response.data;
    },
    onSuccess: async (entry) => {
      await queryClient.invalidateQueries({ queryKey: COURSE_FILES_QUERY_KEY });
      setMoveDialog({ open: false, entry: null, parentId: null });
      setSelectedIds([]);
      toast.success(t('toast.moved'), {
        description: entry.name,
      });
    },
    onError: (error: ApiError) => {
      toast.error(getErrorMessage(error, t('toast.genericError')));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (fileIds: string[]) => {
      const response = await courseFilesService.deleteEntries(courseId, fileIds);
      return response.data;
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: COURSE_FILES_QUERY_KEY });
      setDeleteDialog({ open: false, entries: [] });
      setSelectedIds([]);
      toast.success(t('toast.deleted', { count: result.deletedCount }));
    },
    onError: (error: ApiError) => {
      toast.error(getErrorMessage(error, t('toast.genericError')));
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

    uploadMutation.mutate(file);
  };

  const handlePreviewEntry = async (entry: InventoryEntry) => {
    try {
      const response = await courseFilesService.shareEntry(courseId, entry.id);

      setPreviewDialog({
        entry,
        url: response.data.signedUrl,
        mimeType: entry.mimeType,
      });
    } catch (error) {
      toast.error(getErrorMessage(error, t('toast.previewUnavailable')));
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
      const response = await courseFilesService.shareEntry(courseId, entry.id);
      await copyToClipboard(response.data.signedUrl);
      toast.success(t('toast.shareCopied'), {
        description: entry.name,
      });
    } catch (error) {
      toast.error(getErrorMessage(error, t('toast.genericError')));
    }
  };

  const handleShareSelected = async () => {
    if (selectedFiles.length === 0) {
      toast.error(t('toast.shareFilesOnly'));
      return;
    }

    try {
      const response = await courseFilesService.shareEntries(courseId, {
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
      toast.error(getErrorMessage(error, t('toast.genericError')));
    }
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: COURSE_FILES_QUERY_KEY });
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
    handleShareEntry,
    handleShareSelected,
    isFetching: listQuery.isFetching,
    isLoading: listQuery.isLoading || analyticsQuery.isLoading,
    listPagination: listQuery.data?.pagination,
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
    viewType,
  };
}
