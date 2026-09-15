import type {
  InventoryEntry,
  InventoryTranslations,
} from '@/app/[locale]/(dashboard)/inventory/inventory.types';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { InventoryCard } from './inventory-card';
import { InventoryEmptyState } from './inventory-empty-state';
import { InventoryLoadingSkeleton } from './inventory-loading-skeleton';
import { InventoryTableView } from './inventory-table-view';

type InventoryBrowserProps = {
  courseId: string;
  currentPage: number;
  currentFolderName: string;
  endItem: number;
  entries: InventoryEntry[];
  files: InventoryEntry[];
  folders: InventoryEntry[];
  isLoading: boolean;
  isSearching: boolean;
  isStorageLimitReached: boolean;
  locale: string;
  getUploadProgress: (entryId: string) => number | undefined;
  onClearSearch: () => void;
  onCreateFolder: () => void;
  onDeleteEntry: (entry: InventoryEntry) => void;
  onDownload: (entry: InventoryEntry) => void;
  onMove: (entry: InventoryEntry) => void;
  onNavigateIntoFolder: (entry: InventoryEntry) => void;
  onOpen: (entry: InventoryEntry) => void;
  onPageChange: (nextIndex: number) => void;
  onPreview: (entry: InventoryEntry) => void;
  onRename: (entry: InventoryEntry) => void;
  onSaveToDrive: (entry: InventoryEntry) => void;
  onSaveToOneDrive: (entry: InventoryEntry) => void;
  onSelectAll: (checked: boolean) => void;
  onSelectEntry: (entryId: string, checked: boolean) => void;
  onSelectSingleEntry: (entryId: string) => void;
  onShare: (entry: InventoryEntry) => void;
  onUploadOpen: () => void;
  isSavingToDrive: boolean;
  pageIndex: number;
  selectedIds: string[];
  selectionCount: number;
  startItem: number;
  t: InventoryTranslations;
  totalItems: number;
  totalPages: number;
  viewType: 'grid' | 'list';
};

export function InventoryBrowser({
  courseId,
  currentPage,
  currentFolderName,
  endItem,
  entries,
  files,
  folders,
  isLoading,
  isSearching,
  isStorageLimitReached,
  locale,
  getUploadProgress,
  onClearSearch,
  onCreateFolder,
  onDeleteEntry,
  onDownload,
  onMove,
  onNavigateIntoFolder,
  onOpen,
  onPageChange,
  onPreview,
  onRename,
  onSaveToDrive,
  onSaveToOneDrive,
  onSelectAll,
  onSelectEntry,
  onSelectSingleEntry,
  onShare,
  onUploadOpen,
  isSavingToDrive,
  pageIndex,
  selectedIds,
  selectionCount,
  startItem,
  t,
  totalItems,
  totalPages,
  viewType,
}: InventoryBrowserProps) {
  return (
    <Card className="border-border/70 bg-card/90 p-0 shadow-sm">
      <CardHeader className="flex flex-col gap-2 border-border/60 border-b px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <CardTitle className="font-heading text-xl">
            {currentFolderName}
          </CardTitle>
          <CardDescription>
            {t('browser.description', { count: totalItems })}
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
          <InventoryLoadingSkeleton />
        ) : totalItems === 0 ? (
          <InventoryEmptyState
            isSearching={isSearching}
            isStorageLimitReached={isStorageLimitReached}
            onClearSearch={onClearSearch}
            onCreateFolder={onCreateFolder}
            onUploadOpen={onUploadOpen}
            t={t}
          />
        ) : viewType === 'grid' ? (
          <div className="flex flex-col gap-6">
            {folders.length > 0 && (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {folders.map((entry) => (
                  <InventoryCard
                    key={entry.id}
                    entry={entry}
                    courseId={courseId}
                    isSelected={selectedIds.includes(entry.id)}
                    locale={locale}
                    onOpen={onOpen}
                    onRename={onRename}
                    onMove={onMove}
                    onDelete={onDeleteEntry}
                    onNavigateIntoFolder={onNavigateIntoFolder}
                    onSelectEntry={onSelectSingleEntry}
                  />
                ))}
              </div>
            )}
            {files.length > 0 && (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {files.map((entry) => (
                  <InventoryCard
                    key={entry.id}
                    entry={entry}
                    courseId={courseId}
                    isSelected={selectedIds.includes(entry.id)}
                    locale={locale}
                    onRename={onRename}
                    onMove={onMove}
                    onShare={onShare}
                    onPreview={onPreview}
                    onDownload={onDownload}
                    onSaveToDrive={onSaveToDrive}
                    onSaveToOneDrive={onSaveToOneDrive}
                    onDelete={onDeleteEntry}
                    onSelectEntry={onSelectSingleEntry}
                    uploadProgress={getUploadProgress(entry.id)}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <InventoryTableView
            t={t}
            courseId={courseId}
            entries={entries}
            locale={locale}
            selectedIds={selectedIds}
            selectionCount={selectionCount}
            getUploadProgress={getUploadProgress}
            onDeleteEntry={onDeleteEntry}
            onDownload={onDownload}
            onMove={onMove}
            onNavigateIntoFolder={onNavigateIntoFolder}
            onOpen={onOpen}
            onPreview={onPreview}
            onRename={onRename}
            onSaveToDrive={onSaveToDrive}
            onSaveToOneDrive={onSaveToOneDrive}
            onSelectAll={onSelectAll}
            onSelectEntry={onSelectEntry}
            onShare={onShare}
            isSavingToDrive={isSavingToDrive}
          />
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
                      if (pageIndex > 0) onPageChange(pageIndex - 1);
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
                      if (pageIndex < totalPages - 1)
                        onPageChange(pageIndex + 1);
                    }}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
