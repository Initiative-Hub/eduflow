'use client';

import { useQuery } from '@tanstack/react-query';
import {
  CloudUpload,
  Download,
  Edit2,
  Eye,
  FileIcon,
  FolderOpen,
  MoreVertical,
  Move,
  Share2,
  Trash2,
} from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import type {
  InventoryEntry,
  InventoryTranslations,
} from '@/app/[locale]/(dashboard)/inventory/inventory.types';
import {
  canPreviewInventoryEntry,
  formatDate,
  formatFileSize,
  getEntryTypeLabel,
} from '@/app/[locale]/(dashboard)/inventory/inventory.utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { courseFilesService } from '../course-files.service';

function InventoryEntryPreview({
  entry,
  courseId,
}: {
  entry: InventoryEntry;
  courseId: string;
}) {
  const [previewImageFailed, setPreviewImageFailed] = useState(false);
  const isImagePreview =
    !entry.isFolder && Boolean(entry.mimeType?.startsWith('image/'));

  const previewUrlQuery = useQuery({
    queryKey: ['course-files', courseId, 'preview-url', entry.id],
    queryFn: async () => {
      const response = await courseFilesService.shareEntry(courseId, entry.id);
      return response.data.signedUrl;
    },
    enabled: isImagePreview,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  if (isImagePreview && previewUrlQuery.data && !previewImageFailed) {
    return (
      <Image
        src={previewUrlQuery.data}
        alt={entry.name}
        width={36}
        height={36}
        unoptimized
        onError={() => setPreviewImageFailed(true)}
        className="size-9 rounded-md object-cover"
      />
    );
  }

  return entry.isFolder ? <FolderOpen /> : <FileIcon />;
}

function getStatusVariant(entry: InventoryEntry) {
  if (entry.isFolder) return 'secondary' as const;
  if (entry.status === 'READY') return 'default' as const;
  return 'outline' as const;
}

function getStatusLabel(entry: InventoryEntry, t: InventoryTranslations) {
  if (entry.isFolder) return t('status.folder');
  if (entry.status === 'READY') return t('status.ready');
  if (entry.status === 'UPLOADING') return t('status.processing');
  return entry.status;
}

type InventoryTableViewProps = {
  t: InventoryTranslations;
  courseId: string;
  entries: InventoryEntry[];
  locale: string;
  selectedIds: string[];
  selectionCount: number;
  getUploadProgress: (entryId: string) => number | undefined;
  onDeleteEntry: (entry: InventoryEntry) => void;
  onDownload: (entry: InventoryEntry) => void;
  onMove: (entry: InventoryEntry) => void;
  onNavigateIntoFolder: (entry: InventoryEntry) => void;
  onOpen: (entry: InventoryEntry) => void;
  onPreview: (entry: InventoryEntry) => void;
  onRename: (entry: InventoryEntry) => void;
  onSaveToDrive: (entry: InventoryEntry) => void;
  onSaveToOneDrive: (entry: InventoryEntry) => void;
  onSelectAll: (checked: boolean) => void;
  onSelectEntry: (entryId: string, checked: boolean) => void;
  onShare: (entry: InventoryEntry) => void;
  isSavingToDrive: boolean;
};

export function InventoryTableView({
  t,
  courseId,
  entries,
  locale,
  selectedIds,
  selectionCount,
  getUploadProgress,
  onDeleteEntry,
  onDownload,
  onMove,
  onNavigateIntoFolder,
  onOpen,
  onPreview,
  onRename,
  onSaveToDrive,
  onSaveToOneDrive,
  onSelectAll,
  onSelectEntry,
  onShare,
  isSavingToDrive,
}: InventoryTableViewProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/60">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead className="w-12">
              <Checkbox
                checked={
                  entries.length > 0 && selectionCount === entries.length
                    ? true
                    : selectionCount > 0
                      ? 'indeterminate'
                      : false
                }
                onCheckedChange={(checked) => onSelectAll(Boolean(checked))}
                aria-label={t('selection.toggleAll')}
              />
            </TableHead>
            <TableHead>{t('list.columns.name')}</TableHead>
            <TableHead>{t('list.columns.type')}</TableHead>
            <TableHead>{t('list.columns.size')}</TableHead>
            <TableHead>{t('list.columns.updated')}</TableHead>
            <TableHead>{t('list.columns.status')}</TableHead>
            <TableHead className="text-right">
              <span className="sr-only">{t('list.columns.actions')}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => {
            const uploadProgress = getUploadProgress(entry.id);
            const isUploading = entry.status === 'UPLOADING';
            return (
              <TableRow
                key={entry.id}
                className={cn(isUploading && 'opacity-85')}
              >
                <TableCell>
                  <Checkbox
                    checked={selectedIds.includes(entry.id)}
                    disabled={isUploading}
                    onCheckedChange={(checked) =>
                      onSelectEntry(entry.id, Boolean(checked))
                    }
                    aria-label={t('selection.toggleItem', { name: entry.name })}
                  />
                </TableCell>
                <TableCell>
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={() => {
                      if (!isUploading && entry.isFolder) onOpen(entry);
                    }}
                    onDoubleClick={() => {
                      if (isUploading) return;

                      if (entry.isFolder) {
                        onNavigateIntoFolder(entry);
                        return;
                      }

                      if (canPreviewInventoryEntry(entry)) onPreview(entry);
                    }}
                    className={cn(
                      'flex items-center gap-3 text-left',
                      isUploading && 'cursor-wait'
                    )}
                  >
                    <div className="flex size-9 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      <InventoryEntryPreview
                        entry={entry}
                        courseId={courseId}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-medium">{entry.name}</div>
                      <div className="text-muted-foreground text-xs">
                        {entry.isFolder
                          ? t('fileCard.folder')
                          : formatFileSize(entry.fileSize)}
                      </div>
                    </div>
                  </button>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{getEntryTypeLabel(entry)}</Badge>
                </TableCell>
                <TableCell>
                  {entry.isFolder ? '—' : formatFileSize(entry.fileSize)}
                </TableCell>
                <TableCell>{formatDate(entry.updatedAt, locale)}</TableCell>
                <TableCell>
                  <div className="min-w-32 space-y-1">
                    <Badge variant={getStatusVariant(entry)}>
                      {getStatusLabel(entry, t)}
                    </Badge>
                    {!entry.isFolder && entry.status === 'UPLOADING' && (
                      <div className="min-w-36 space-y-1">
                        <Progress
                          value={uploadProgress}
                          className="h-2 animate-pulse"
                        />
                        {typeof uploadProgress === 'number' && (
                          <div className="text-[11px] text-muted-foreground">
                            {t('fileCard.uploadProgress', {
                              progress: uploadProgress,
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={isUploading}
                      >
                        <MoreVertical />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem
                        onClick={() => onRename(entry)}
                        className="cursor-pointer gap-2"
                      >
                        <Edit2 />
                        {t('actions.rename')}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onMove(entry)}
                        className="cursor-pointer gap-2"
                      >
                        <Move />
                        {t('actions.move')}
                      </DropdownMenuItem>
                      {entry.isFolder ? (
                        <DropdownMenuItem
                          onClick={() => onNavigateIntoFolder(entry)}
                          className="cursor-pointer gap-2"
                        >
                          <FolderOpen />
                          {t('actions.open')}
                        </DropdownMenuItem>
                      ) : (
                        entry.status === 'READY' && (
                          <>
                            {canPreviewInventoryEntry(entry) && (
                              <DropdownMenuItem
                                onClick={() => onPreview(entry)}
                                className="cursor-pointer gap-2"
                              >
                                <Eye />
                                {t('actions.preview')}
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuItem
                              onClick={() => onShare(entry)}
                              className="cursor-pointer gap-2"
                            >
                              <Share2 />
                              {t('actions.share')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => onDownload(entry)}
                              className="cursor-pointer gap-2"
                            >
                              <Download />
                              {t('actions.download')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => onSaveToDrive(entry)}
                              className="cursor-pointer gap-2"
                              disabled={isSavingToDrive}
                            >
                              <CloudUpload />
                              {isSavingToDrive
                                ? t('actions.savingToDrive')
                                : t('actions.saveToDrive')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => onSaveToOneDrive(entry)}
                              className="cursor-pointer gap-2"
                              disabled={isSavingToDrive}
                            >
                              <CloudUpload />
                              {isSavingToDrive
                                ? t('actions.savingToDrive')
                                : t('actions.saveToOneDrive')}
                            </DropdownMenuItem>
                          </>
                        )
                      )}
                      <DropdownMenuItem
                        onClick={() => onDeleteEntry(entry)}
                        className="cursor-pointer gap-2"
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
  );
}
