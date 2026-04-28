'use client';

import {
  Download,
  Edit2,
  Eye,
  FileIcon,
  FolderOpen,
  FolderPlus,
  HardDrive,
  LayoutGrid,
  LayoutList,
  Loader2,
  MoreVertical,
  Move,
  RefreshCw,
  Search,
  Share2,
  Trash2,
  Upload,
} from 'lucide-react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { Fragment } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dropzone } from '@/components/ui/dropzone';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import {
  Field,
  FieldContent,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton as SkeletonBlock } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { FileCard } from './file-card';
import { inventoryService } from './inventory.service';
import {
  formatDate,
  formatFileSize,
  getEntryTypeLabel,
  isPreviewableEntry,
} from './inventory.utils';
import {
  type InventoryEntry,
  STORAGE_LIMIT_BYTES,
  STORAGE_PAGE_SIZE,
} from './types';
import { useInventory } from './use-inventory';

const ROOT_OPTION_VALUE = '__root__';

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

function getStatusVariant(entry: InventoryEntry) {
  if (entry.isFolder) return 'secondary' as const;
  if (entry.status === 'READY') return 'secondary' as const;
  if (entry.status === 'UPLOADING') return 'outline' as const;
  return 'outline' as const;
}

function getStatusLabel(
  entry: InventoryEntry,
  t: ReturnType<typeof useTranslations>
) {
  if (entry.isFolder) return t('status.folder');
  if (entry.status === 'READY') return t('status.ready');
  if (entry.status === 'UPLOADING') return t('status.processing');
  return entry.status;
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

    if (isPreviewableEntry(entry)) {
      void handlePreviewEntry(entry);
      return;
    }

    downloadEntry(entry);
  };

  const handleDownloadFromMenu = (entry: InventoryEntry) => {
    downloadEntry(entry);
  };

  return (
    <div className="relative flex flex-col gap-6 overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72">
        <div className="absolute top-10 left-0 size-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute top-4 right-0 size-80 rounded-full bg-accent/10 blur-3xl" />
      </div>

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

      <Card className="overflow-hidden border-border/70 bg-card/90 shadow-foreground/5 shadow-lg">
        <CardHeader className="border-border/60 border-b bg-muted/20 px-6 py-6">
          <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
            <div className="space-y-4">
              <Badge variant="secondary" className="w-fit">
                {t('hero.badge')}
              </Badge>
              <div className="space-y-2">
                <CardTitle className="font-heading text-3xl md:text-4xl">
                  {t('title')}
                </CardTitle>
                <CardDescription className="max-w-2xl text-base">
                  {t('hero.description')}
                </CardDescription>
              </div>
              <Breadcrumb>
                <BreadcrumbList>
                  {breadcrumbItems.map((item, index) => {
                    const isLast = index === breadcrumbItems.length - 1;

                    return (
                      <Fragment key={item.id}>
                        {index > 0 && <BreadcrumbSeparator />}
                        <BreadcrumbItem>
                          {isLast ? (
                            <BreadcrumbPage>{item.name}</BreadcrumbPage>
                          ) : (
                            <BreadcrumbLink asChild>
                              <button
                                type="button"
                                onClick={() => handleGoToBreadcrumb(index)}
                                className="transition-colors hover:text-foreground"
                              >
                                {item.name}
                              </button>
                            </BreadcrumbLink>
                          )}
                        </BreadcrumbItem>
                      </Fragment>
                    );
                  })}
                </BreadcrumbList>
              </Breadcrumb>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{currentPathLabel}</Badge>
                {selectionCount > 0 && (
                  <Badge variant="secondary">
                    {t('selection.count', { count: selectionCount })}
                  </Badge>
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border/60 bg-background/80 p-4 shadow-sm">
                <div className="text-muted-foreground text-xs">
                  {t('stats.files')}
                </div>
                <div className="mt-2 font-heading text-2xl">
                  {analytics?.fileCount ?? 0}
                </div>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/80 p-4 shadow-sm">
                <div className="text-muted-foreground text-xs">
                  {t('stats.folders')}
                </div>
                <div className="mt-2 font-heading text-2xl">
                  {analytics?.folderCount ?? 0}
                </div>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/80 p-4 shadow-sm">
                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                  <HardDrive className="size-4" />
                  {t('stats.storage')}
                </div>
                <div className="mt-2 font-heading text-2xl">
                  {formatFileSize(storageUsed)}
                </div>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/80 p-4 shadow-sm">
                <div className="text-muted-foreground text-xs">
                  {t('stats.currentFolder')}
                </div>
                <div className="mt-2 font-heading text-2xl">{totalItems}</div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 p-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{t('storage.label')}</span>
              <span
                className={cn(
                  'text-muted-foreground',
                  isStorageLimitReached && 'text-destructive'
                )}
              >
                {storageUsageLabel}
              </span>
            </div>
            <Progress value={storagePercentage} />
            {isStorageLimitReached && (
              <p className="text-destructive text-sm">
                {t('storage.limitReached')}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/90 shadow-sm">
        <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-3 xl:flex-row xl:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder={t('toolbar.searchPlaceholder')}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw
                  data-icon="inline-start"
                  className={cn(isFetching && 'animate-spin')}
                />
                {isFetching ? t('toolbar.refreshing') : t('toolbar.refresh')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCreateFolderDialog({
                    open: true,
                    value: '',
                  })
                }
              >
                <FolderPlus data-icon="inline-start" />
                {t('actions.newFolder')}
              </Button>
              <Button
                size="sm"
                onClick={() => setUploadOpen(true)}
                disabled={isStorageLimitReached}
              >
                <Upload data-icon="inline-start" />
                {t('actions.upload')}
              </Button>
            </div>
          </div>

          <Tabs
            value={viewType}
            onValueChange={(value) =>
              setViewType(value === 'list' ? 'list' : 'grid')
            }
          >
            <TabsList>
              <TabsTrigger value="grid">
                <LayoutGrid data-icon="inline-start" />
                {t('view.grid')}
              </TabsTrigger>
              <TabsTrigger value="list">
                <LayoutList data-icon="inline-start" />
                {t('view.list')}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {selectionCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-muted/50 px-4 py-3">
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="outline">{selectionCount}</Badge>
            <span>{t('selection.label', { count: selectionCount })}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleShareSelected}
              disabled={!hasSelectedFiles}
            >
              <Share2 data-icon="inline-start" />
              {t('actions.shareSelected')}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleRequestDelete(selectedEntries)}
              disabled={selectedEntries.length === 0}
            >
              <Trash2 data-icon="inline-start" />
              {t('actions.deleteSelected')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSelectAll(false)}
            >
              {t('actions.clearSelection')}
            </Button>
          </div>
        </div>
      )}

      <Card className="border-border/70 bg-card/90 shadow-sm">
        <CardHeader className="flex flex-col gap-2 border-border/60 border-b px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="font-heading text-xl">
              {t('browser.title')}
            </CardTitle>
            <CardDescription>
              {t('browser.description', { count: totalItems })}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{currentPathLabel}</Badge>
            <Badge variant="secondary">
              {t('browser.pageInfo', {
                page: currentPage,
                total: totalPages,
                start: startItem,
                end: endItem,
              })}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {isLoading ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Card
                    key={index}
                    className="border-border/60 bg-background/60"
                  >
                    <CardHeader className="gap-3 border-border/50 border-b pb-4">
                      <div className="flex items-start gap-3">
                        <SkeletonBlock className="size-11 rounded-2xl" />
                        <div className="flex-1 space-y-2">
                          <SkeletonBlock className="h-4 w-3/4" />
                          <SkeletonBlock className="h-3 w-1/2" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 py-4">
                      <SkeletonBlock className="h-20 rounded-xl" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : totalItems === 0 ? (
            <Empty className="min-h-105 border-border/60 bg-muted/20">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  {isSearching ? <Search /> : <FolderOpen />}
                </EmptyMedia>
                <EmptyTitle>
                  {isSearching ? t('emptySearch.title') : t('empty.title')}
                </EmptyTitle>
                <EmptyDescription>
                  {isSearching
                    ? t('emptySearch.description')
                    : t('empty.description')}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                {isSearching ? (
                  <Button
                    variant="outline"
                    onClick={() => handleSearchChange('')}
                  >
                    {t('emptySearch.clear')}
                  </Button>
                ) : (
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() =>
                        setCreateFolderDialog({
                          open: true,
                          value: '',
                        })
                      }
                    >
                      {t('empty.createFolder')}
                    </Button>
                    <Button
                      onClick={() => setUploadOpen(true)}
                      disabled={isStorageLimitReached}
                    >
                      {t('empty.action')}
                    </Button>
                  </div>
                )}
              </EmptyContent>
            </Empty>
          ) : viewType === 'grid' ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {entries.map((entry) => (
                <FileCard
                  key={entry.id}
                  entry={entry}
                  locale={locale}
                  onOpen={handleOpenEntry}
                  onRename={handleOpenRenameDialog}
                  onMove={handleOpenMoveDialog}
                  onShare={handleShareEntry}
                  onPreview={handlePreviewEntry}
                  onDownload={handleDownloadFromMenu}
                  onDelete={(nextEntry) => handleRequestDelete([nextEntry])}
                />
              ))}
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="w-12">
                      <Checkbox
                        checked={
                          entries.length > 0 &&
                          selectionCount === entries.length
                            ? true
                            : selectionCount > 0
                              ? 'indeterminate'
                              : false
                        }
                        onCheckedChange={(checked) =>
                          handleSelectAll(Boolean(checked))
                        }
                        aria-label={t('selection.toggleAll')}
                      />
                    </TableHead>
                    <TableHead>{t('list.columns.name')}</TableHead>
                    <TableHead>{t('list.columns.type')}</TableHead>
                    <TableHead>{t('list.columns.size')}</TableHead>
                    <TableHead>{t('list.columns.updated')}</TableHead>
                    <TableHead>{t('list.columns.status')}</TableHead>
                    <TableHead className="text-right">
                      <span className="sr-only">
                        {t('list.columns.actions')}
                      </span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => {
                    const isFolder = entry.isFolder;
                    const previewable = isPreviewableEntry(entry);
                    const statusVariant = getStatusVariant(entry);
                    const statusLabel = getStatusLabel(entry, t);

                    return (
                      <TableRow key={entry.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.includes(entry.id)}
                            onCheckedChange={(checked) =>
                              handleSelectEntry(entry.id, Boolean(checked))
                            }
                            aria-label={t('selection.toggleItem', {
                              name: entry.name,
                            })}
                          />
                        </TableCell>
                        <TableCell>
                          <button
                            type="button"
                            onClick={() => handleOpenEntry(entry)}
                            className="flex items-center gap-3 text-left"
                          >
                            <div className="flex size-9 items-center justify-center rounded-md bg-muted text-muted-foreground">
                              {isFolder ? <FolderOpen /> : <FileIcon />}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate font-medium">
                                {entry.name}
                              </div>
                              <div className="text-muted-foreground text-xs">
                                {isFolder
                                  ? t('fileCard.folder')
                                  : formatFileSize(entry.fileSize)}
                              </div>
                            </div>
                          </button>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getEntryTypeLabel(entry)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {isFolder ? '—' : formatFileSize(entry.fileSize)}
                        </TableCell>
                        <TableCell>
                          {formatDate(entry.updatedAt, locale)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant}>{statusLabel}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon-sm">
                                <MoreVertical />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem
                                onClick={() => handleOpenRenameDialog(entry)}
                                className="cursor-pointer gap-2"
                              >
                                <Edit2 />
                                {t('actions.rename')}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleOpenMoveDialog(entry)}
                                className="cursor-pointer gap-2"
                              >
                                <Move />
                                {t('actions.move')}
                              </DropdownMenuItem>
                              {isFolder ? (
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleNavigateIntoFolder(entry)
                                  }
                                  className="cursor-pointer gap-2"
                                >
                                  <FolderOpen />
                                  {t('actions.open')}
                                </DropdownMenuItem>
                              ) : (
                                <>
                                  {previewable && (
                                    <DropdownMenuItem
                                      onClick={() => handlePreviewEntry(entry)}
                                      className="cursor-pointer gap-2"
                                    >
                                      <Eye />
                                      {t('actions.preview')}
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem
                                    onClick={() => handleShareEntry(entry)}
                                    className="cursor-pointer gap-2"
                                  >
                                    <Share2 />
                                    {t('actions.share')}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleDownloadFromMenu(entry)
                                    }
                                    className="cursor-pointer gap-2"
                                  >
                                    <Download />
                                    {t('actions.download')}
                                  </DropdownMenuItem>
                                </>
                              )}
                              <DropdownMenuItem
                                onClick={() => handleRequestDelete([entry])}
                                className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                              >
                                <Trash2 />
                                {t('actions.delete')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="text-muted-foreground text-sm">
                {t('browser.range', {
                  start: startItem,
                  end: endItem,
                  total: totalItems,
                })}
              </div>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      text={t('pagination.previous')}
                      onClick={(event) => {
                        event.preventDefault();
                        if (pageIndex > 0) {
                          handlePageChange(pageIndex - 1);
                        }
                      }}
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <Badge variant="outline" className="h-8 px-3">
                      {t('pagination.page', {
                        page: currentPage,
                        total: totalPages,
                      })}
                    </Badge>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      text={t('pagination.next')}
                      onClick={(event) => {
                        event.preventDefault();
                        if (pageIndex < totalPages - 1) {
                          handlePageChange(pageIndex + 1);
                        }
                      }}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={uploadOpen} onOpenChange={(open) => setUploadOpen(open)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{t('uploadDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('uploadDialog.description')}
            </DialogDescription>
          </DialogHeader>
          <Dropzone
            maxFiles={1}
            maxSize={STORAGE_LIMIT_BYTES}
            disabled={uploadPending || isStorageLimitReached}
            onDrop={(acceptedFiles) => handleUploadFiles(acceptedFiles)}
          >
            <div className="flex flex-col items-center gap-3 py-2 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                {uploadPending ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Upload />
                )}
              </div>
              <div className="space-y-1">
                <div className="font-medium">
                  {t('uploadDialog.dropzoneTitle')}
                </div>
                <div className="text-muted-foreground text-sm">
                  {t('uploadDialog.dropzoneDescription')}
                </div>
              </div>
              <Badge variant="outline">{t('uploadDialog.dropzoneHint')}</Badge>
            </div>
          </Dropzone>
          {isStorageLimitReached && (
            <p className="text-destructive text-sm">
              {t('storage.limitReached')}
            </p>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t('actions.cancel')}</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={createFolderDialog.open}
        onOpenChange={(open) =>
          setCreateFolderDialog(
            open ? { ...createFolderDialog, open } : { open: false, value: '' }
          )
        }
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('createFolderDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('createFolderDialog.description')}
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="create-folder-name">
                {t('createFolderDialog.label')}
              </FieldLabel>
              <FieldContent>
                <Input
                  id="create-folder-name"
                  value={createFolderDialog.value}
                  onChange={(event) =>
                    setCreateFolderDialog((current) => ({
                      ...current,
                      value: event.target.value,
                    }))
                  }
                  placeholder={t('createFolderDialog.placeholder')}
                />
              </FieldContent>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t('actions.cancel')}</Button>
            </DialogClose>
            <Button
              onClick={handleCreateFolderSubmit}
              disabled={!createFolderDialog.value.trim() || createFolderPending}
            >
              {createFolderPending ? (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              ) : (
                <FolderPlus data-icon="inline-start" />
              )}
              {t('createFolderDialog.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={renameDialog.open}
        onOpenChange={(open) =>
          setRenameDialog(
            open
              ? { ...renameDialog, open }
              : { open: false, entry: null, value: '' }
          )
        }
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('renameDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('renameDialog.description')}
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="rename-item-name">
                {t('renameDialog.label')}
              </FieldLabel>
              <FieldContent>
                <Input
                  id="rename-item-name"
                  value={renameDialog.value}
                  onChange={(event) =>
                    setRenameDialog((current) => ({
                      ...current,
                      value: event.target.value,
                    }))
                  }
                />
              </FieldContent>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t('actions.cancel')}</Button>
            </DialogClose>
            <Button
              onClick={handleRenameSubmit}
              disabled={!renameDialog.value.trim() || renamePending}
            >
              {renamePending ? (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              ) : (
                <Edit2 data-icon="inline-start" />
              )}
              {t('actions.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={moveDialog.open}
        onOpenChange={(open) =>
          setMoveDialog(
            open
              ? { ...moveDialog, open }
              : { open: false, entry: null, parentId: null }
          )
        }
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('moveDialog.title')}</DialogTitle>
            <DialogDescription>{t('moveDialog.description')}</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="move-target-folder">
                {t('moveDialog.label')}
              </FieldLabel>
              <FieldContent>
                <Select
                  value={moveDialog.parentId ?? ROOT_OPTION_VALUE}
                  onValueChange={(value) =>
                    setMoveDialog((current) => ({
                      ...current,
                      parentId: value === ROOT_OPTION_VALUE ? null : value,
                    }))
                  }
                >
                  <SelectTrigger id="move-target-folder">
                    <SelectValue placeholder={t('moveDialog.placeholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {moveOptions.map((option) => (
                        <SelectItem
                          key={option.id ?? ROOT_OPTION_VALUE}
                          value={option.id ?? ROOT_OPTION_VALUE}
                        >
                          {option.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </FieldContent>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t('actions.cancel')}</Button>
            </DialogClose>
            <Button onClick={handleMoveSubmit} disabled={movePending}>
              {movePending ? (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              ) : (
                <Move data-icon="inline-start" />
              )}
              {t('moveDialog.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) =>
          setDeleteDialog(open ? deleteDialog : { open: false, entries: [] })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteDialog.description', {
                count: deleteDialog.entries.length,
              })}
              <div className="mt-3 rounded-xl border border-border/60 bg-muted/40 p-3 text-left text-foreground text-sm">
                <div className="font-medium">
                  {deleteDialog.entries
                    .slice(0, 4)
                    .map((entry) => entry.name)
                    .join(', ')}
                </div>
                {deleteDialog.entries.length > 4 && (
                  <div className="text-muted-foreground text-xs">
                    {t('deleteDialog.more', {
                      count: deleteDialog.entries.length - 4,
                    })}
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletePending ? (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              ) : (
                <Trash2 data-icon="inline-start" />
              )}
              {t('actions.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={Boolean(previewDialog)}
        onOpenChange={(open) => {
          if (!open) {
            closePreview();
          }
        }}
      >
        <DialogContent className="max-w-5xl overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              {previewDialog?.entry.name ?? t('previewDialog.title')}
            </DialogTitle>
            <DialogDescription>
              {previewDialog
                ? t('previewDialog.description', {
                    type: getEntryTypeLabel(previewDialog.entry),
                  })
                : t('previewDialog.placeholder')}
            </DialogDescription>
          </DialogHeader>
          {previewDialog && (
            <div className="overflow-hidden rounded-2xl border border-border/60 bg-muted/20 p-3">
              {previewDialog.mimeType?.startsWith('image/') ? (
                <Image
                  src={previewDialog.url}
                  alt={previewDialog.entry.name}
                  width={1600}
                  height={1200}
                  unoptimized
                  className="max-h-[70vh] w-full rounded-xl object-contain"
                />
              ) : previewDialog.mimeType === 'application/pdf' ? (
                <iframe
                  src={previewDialog.url}
                  title={previewDialog.entry.name}
                  className="h-[70vh] w-full rounded-xl border border-border/60 bg-background"
                />
              ) : (
                <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 rounded-xl border border-border/60 border-dashed bg-background/60 p-6 text-center">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                    <FileIcon />
                  </div>
                  <div className="space-y-1">
                    <div className="font-medium">
                      {previewDialog.entry.name}
                    </div>
                    <div className="text-muted-foreground text-sm">
                      {t('previewDialog.unsupported')}
                    </div>
                  </div>
                  <Button asChild>
                    <a
                      href={inventoryService.getDownloadUrl(
                        previewDialog.entry.id
                      )}
                    >
                      <Download data-icon="inline-start" />
                      {t('actions.download')}
                    </a>
                  </Button>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" onClick={closePreview}>
                {t('actions.cancel')}
              </Button>
            </DialogClose>
            {previewDialog && (
              <Button asChild>
                <a
                  href={inventoryService.getDownloadUrl(previewDialog.entry.id)}
                >
                  <Download data-icon="inline-start" />
                  {t('actions.download')}
                </a>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
