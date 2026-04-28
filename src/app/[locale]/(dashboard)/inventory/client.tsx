'use client';

import { RefreshCw } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { InventoryBrowser } from './_components/inventory-browser';
import { InventoryDialogs } from './_components/inventory-dialogs';
import { InventoryHeader } from './_components/inventory-header';
import { InventoryPathBar } from './_components/inventory-path-bar';
import { InventoryToolbar } from './_components/inventory-toolbar';
import { SelectionBar } from './_components/selection-bar';
import { inventoryService } from './inventory.service';
import { formatFileSize } from './inventory.utils';
import {
  type InventoryEntry,
  STORAGE_LIMIT_BYTES,
  STORAGE_PAGE_SIZE,
} from './types';
import { useInventory } from './use-inventory';

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
  anchor.href = inventoryService.getDownloadUrl(entry.id);
  anchor.download = entry.name;
  anchor.rel = 'noreferrer';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export function InventoryClient() {
  const t = useTranslations('InventoryPage');
  const locale = useLocale();
  const {
    analytics,
    breadcrumbItems,
    closePreview,
    createFolderDialog,
    createFolderPending,
    currentPathLabel,
    deleteDialog,
    deletePending,
    entries,
    handleCreateFolderSubmit,
    handleDeleteConfirm,
    handleGoToBreadcrumb,
    handleMoveSubmit,
    handleNavigateIntoFolder,
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
    isFetching,
    isLoading,
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
    viewType,
  } = useInventory();

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

  const handleOpenEntry = (entry: InventoryEntry) => {
    if (entry.isFolder) {
      handleNavigateIntoFolder(entry);
      return;
    }
    if (
      entry.mimeType?.startsWith('image/') ||
      entry.mimeType === 'application/pdf'
    ) {
      handlePreviewEntry(entry);
      return;
    }
    downloadEntry(entry);
  };

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
        setViewType={setViewType}
        t={t}
        viewType={viewType}
      />

      <InventoryPathBar
        breadcrumbItems={breadcrumbItems}
        onGoToBreadcrumb={handleGoToBreadcrumb}
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
        currentPage={currentPage}
        currentPathLabel={currentPathLabel}
        endItem={endItem}
        entries={entries}
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
        onSelectAll={handleSelectAll}
        onSelectEntry={handleSelectEntry}
        onShare={handleShareEntry}
        onUploadOpen={() => setUploadOpen(true)}
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
        onUploadFiles={handleUploadFiles}
        previewDialog={previewDialog}
        renameDialog={renameDialog}
        renamePending={renamePending}
        setCreateFolderDialog={setCreateFolderDialog}
        setDeleteDialog={setDeleteDialog}
        setMoveDialog={setMoveDialog}
        setRenameDialog={setRenameDialog}
        setUploadOpen={setUploadOpen}
        storageLimitBytes={STORAGE_LIMIT_BYTES}
        t={t}
        uploadOpen={uploadOpen}
        uploadPending={uploadPending}
      />
    </div>
  );
}
