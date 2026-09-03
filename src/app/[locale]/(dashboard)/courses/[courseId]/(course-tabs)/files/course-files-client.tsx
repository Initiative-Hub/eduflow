'use client';

import { RefreshCw } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import {
  type InventoryEntry,
  STORAGE_LIMIT_BYTES,
  STORAGE_MAX_FILE_SIZE_BYTES,
  STORAGE_PAGE_SIZE,
} from '@/app/[locale]/(dashboard)/inventory/inventory.types';
import { formatFileSize } from '@/app/[locale]/(dashboard)/inventory/inventory.utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useGoogleDriveExport } from '@/hooks/use-google-drive-export';
import { useOneDriveExport } from '@/hooks/use-onedrive-export';
import { cn } from '@/lib/utils';
import { InventoryBrowser } from './_components/inventory-browser';
import { InventoryDialogs } from './_components/inventory-dialogs';
import { InventoryHeader } from './_components/inventory-header';
import { InventoryPathBar } from './_components/inventory-pathbar';
import { InventoryToolbar } from './_components/inventory-toolbar';
import { SelectionBar } from './_components/selection-bar';
import { courseFilesService } from './course-files.service';
import { useFiles } from './use-files';

function resolveErrorMessage(error: unknown, fallback: string) {
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

function downloadEntry(entry: InventoryEntry) {
  const anchor = document.createElement('a');
  anchor.href = courseFilesService.getDownloadPayload(entry.id);
  anchor.download = entry.name;
  anchor.rel = 'noreferrer';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export default function CourseFilesClient() {
  const params = useParams();
  const courseId = params.courseId as string;
  const t = useTranslations('CourseFilesPage');
  const locale = useLocale();
  const googleDriveExport = useGoogleDriveExport();
  const oneDriveExport = useOneDriveExport();

  const {
    analytics,
    breadcrumbItems,
    closePreview,
    createFolderDialog,
    createFolderPending,
    currentFolderName,
    deleteDialog,
    deletePending,
    entries,
    files,
    folders,
    getUploadProgress,
    handleCreateFolderSubmit,
    handleDeleteConfirm,
    handleGoToBreadcrumb,
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
    handleUploadFiles,
    handleImportGoogleDriveFile,
    handleImportOneDriveFile,
    isFetching,
    isLoading,
    maxFileSizeBytes,
    listPagination,
    loadError,
    moveDialog,
    moveOptions,
    movePending,
    pageIndex,
    previewDialog,
    renameDialog,
    renamePending,
    search,
    selectedEntries,
    selectedFiles,
    selectedIds,
    setCreateFolderDialog,
    setDeleteDialog,
    setMoveDialog,
    setRenameDialog,
    setUploadOpen,
    setViewType,
    uploadOpen,
    uploadPending,
    googleDriveImportPending,
    oneDriveImportPending,
    viewType,
  } = useFiles({
    courseId,
    maxFileSizeBytes: STORAGE_MAX_FILE_SIZE_BYTES,
  });

  const storageUsed = analytics?.totalSizeBytes ?? 0;
  const storagePercentage =
    storageUsed === 0
      ? 0
      : Math.min(100, (storageUsed / STORAGE_LIMIT_BYTES) * 100);
  const isStorageLimitReached = storageUsed >= STORAGE_LIMIT_BYTES;
  const storageUsageLabel = t('storage.usage', {
    used: formatFileSize(storageUsed),
    total: formatFileSize(STORAGE_LIMIT_BYTES),
  });

  const totalItems = listPagination?.total ?? entries.length;
  const currentPage = pageIndex + 1;
  const totalPages = Math.max(1, Math.ceil(totalItems / STORAGE_PAGE_SIZE));
  const startItem = totalItems === 0 ? 0 : pageIndex * STORAGE_PAGE_SIZE + 1;
  const endItem = Math.min(totalItems, (pageIndex + 1) * STORAGE_PAGE_SIZE);
  const selectionCount = selectedIds.length;
  const hasSelectedFiles = selectedFiles.length > 0;
  const isSearching = Boolean(search.trim());
  const loadErrorMessage = loadError
    ? resolveErrorMessage(loadError, t('errors.description'))
    : null;

  function saveEntryToDrive(entry: InventoryEntry) {
    if (entry.isFolder || entry.status !== 'READY') return;
    googleDriveExport.mutate({
      kind: 'inventory_file',
      courseId,
      fileId: entry.id,
    });
  }

  function saveEntryToOneDrive(entry: InventoryEntry) {
    if (entry.isFolder || entry.status !== 'READY') return;
    oneDriveExport.mutate({
      kind: 'inventory_file',
      courseId,
      fileId: entry.id,
    });
  }

  return (
    <div className="relative flex flex-col gap-6 overflow-hidden">
      {loadErrorMessage && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="font-medium text-destructive">
                {t('errors.title')}
              </div>
              <div className="text-muted-foreground text-sm">
                {loadErrorMessage}
              </div>
            </div>
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw
                data-icon="inline-start"
                className={cn(isFetching && 'animate-spin')}
              />
              {t('errors.retry')}
            </Button>
          </CardContent>
        </Card>
      )}

      <InventoryHeader
        analytics={analytics}
        isStorageLimitReached={isStorageLimitReached}
        storagePercentage={storagePercentage}
        storageUsageLabel={storageUsageLabel}
        storageUsed={storageUsed}
        t={t}
        totalItems={totalItems}
      />

      <InventoryToolbar
        isFetching={isFetching}
        isStorageLimitReached={isStorageLimitReached}
        onCreateFolder={() => setCreateFolderDialog({ open: true, value: '' })}
        onRefresh={handleRefresh}
        onSearchChange={handleSearchChange}
        onUploadOpen={() => setUploadOpen(true)}
        search={search}
        t={t}
      />

      <InventoryPathBar
        breadcrumbItems={breadcrumbItems}
        onGoToBreadcrumb={handleGoToBreadcrumb}
        setViewType={setViewType}
        t={t}
        viewType={viewType}
      />

      <SelectionBar
        hasSelectedFiles={hasSelectedFiles}
        onClearSelection={() => handleSelectAll(false)}
        onDeleteSelected={() => handleRequestDelete(selectedEntries)}
        onShareSelected={handleShareSelected}
        selectedEntriesCount={selectedEntries.length}
        selectionCount={selectionCount}
        t={t}
      />

      <InventoryBrowser
        courseId={courseId}
        currentPage={currentPage}
        endItem={endItem}
        entries={entries}
        currentFolderName={currentFolderName}
        files={files}
        folders={folders}
        isLoading={isLoading}
        isSearching={isSearching}
        isStorageLimitReached={isStorageLimitReached}
        locale={locale}
        onClearSearch={() => handleSearchChange('')}
        onCreateFolder={() => setCreateFolderDialog({ open: true, value: '' })}
        onDeleteEntry={(entry) => handleRequestDelete([entry])}
        onDownload={downloadEntry}
        onMove={handleOpenMoveDialog}
        onNavigateIntoFolder={handleNavigateIntoFolder}
        onOpen={handleOpenEntry}
        onPageChange={handlePageChange}
        onPreview={handlePreviewEntry}
        onRename={handleOpenRenameDialog}
        onSaveToDrive={saveEntryToDrive}
        onSaveToOneDrive={saveEntryToOneDrive}
        onSelectAll={handleSelectAll}
        onSelectEntry={handleSelectEntry}
        onShare={handleShareEntry}
        isSavingToDrive={
          googleDriveExport.isPending || oneDriveExport.isPending
        }
        onUploadOpen={() => setUploadOpen(true)}
        getUploadProgress={getUploadProgress}
        pageIndex={pageIndex}
        selectedIds={selectedIds}
        selectionCount={selectionCount}
        startItem={startItem}
        t={t}
        totalItems={totalItems}
        totalPages={totalPages}
        viewType={viewType}
      />

      <InventoryDialogs
        closePreview={closePreview}
        createFolderDialog={createFolderDialog}
        createFolderPending={createFolderPending}
        deleteDialog={deleteDialog}
        deletePending={deletePending}
        handleCreateFolderSubmit={handleCreateFolderSubmit}
        handleDeleteConfirm={handleDeleteConfirm}
        handleMoveSubmit={handleMoveSubmit}
        handleRenameSubmit={handleRenameSubmit}
        isStorageLimitReached={isStorageLimitReached}
        moveDialog={moveDialog}
        moveOptions={moveOptions}
        movePending={movePending}
        onImportGoogleDriveFile={handleImportGoogleDriveFile}
        onImportOneDriveFile={handleImportOneDriveFile}
        onSaveToDrive={saveEntryToDrive}
        onSaveToOneDrive={saveEntryToOneDrive}
        onUploadFiles={handleUploadFiles}
        googleDriveImportPending={googleDriveImportPending}
        oneDriveImportPending={oneDriveImportPending}
        googleDriveExportPending={googleDriveExport.isPending}
        oneDriveExportPending={oneDriveExport.isPending}
        previewDialog={previewDialog}
        renameDialog={renameDialog}
        renamePending={renamePending}
        setCreateFolderDialog={setCreateFolderDialog}
        setDeleteDialog={setDeleteDialog}
        setMoveDialog={setMoveDialog}
        setRenameDialog={setRenameDialog}
        setUploadOpen={setUploadOpen}
        maxFileSizeBytes={maxFileSizeBytes}
        t={t}
        uploadOpen={uploadOpen}
        uploadPending={uploadPending}
      />
    </div>
  );
}
