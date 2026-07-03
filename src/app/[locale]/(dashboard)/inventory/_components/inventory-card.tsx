'use client';

import { useQuery } from '@tanstack/react-query';
import {
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
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { inventoryService } from '../inventory.service';
import type { InventoryEntry } from '../inventory.types';
import {
  canPreviewInventoryEntry,
  formatDate,
  formatFileSize,
  getEntryTypeLabel,
} from '../inventory.utils';

interface FileCardProps {
  entry: InventoryEntry;
  locale: string;
  onOpen?: (entry: InventoryEntry) => void;
  onRename: (entry: InventoryEntry) => void;
  onMove: (entry: InventoryEntry) => void;
  onShare?: (entry: InventoryEntry) => void;
  onPreview?: (entry: InventoryEntry) => void;
  onDownload?: (entry: InventoryEntry) => void;
  onDelete: (entry: InventoryEntry) => void;
  onNavigateIntoFolder?: (entry: InventoryEntry) => void;
  uploadProgress?: number;
}

export function InventoryCard({
  entry,
  locale,
  onOpen,
  onRename,
  onMove,
  onShare,
  onPreview,
  onDownload,
  onDelete,
  onNavigateIntoFolder,
  uploadProgress,
}: FileCardProps) {
  const t = useTranslations('InventoryPage');
  const [previewImageFailed, setPreviewImageFailed] = useState(false);
  const isImagePreview =
    !entry.isFolder && Boolean(entry.mimeType?.startsWith('image/'));

  const previewUrlQuery = useQuery({
    queryKey: ['inventory', 'preview-url', entry.id],
    queryFn: async () => {
      const response = await inventoryService.shareEntry(entry.id);
      return response.data.signedUrl;
    },
    enabled: isImagePreview,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  return (
    <Card className="group/card h-fit border-border/70 bg-card/90 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <CardHeader className="gap-3">
        <div className="flex items-start justify-between gap-3 overflow-hidden">
          <button
            type="button"
            className="flex flex-1 gap-3 overflow-hidden text-left"
            onClick={() => {
              if (entry.isFolder) onOpen?.(entry);
            }}
            onDoubleClick={() => {
              if (entry.isFolder) {
                onNavigateIntoFolder?.(entry);
                return;
              }

              if (canPreviewInventoryEntry(entry)) {
                onPreview?.(entry);
              }
            }}
          >
            <div
              className={cn(
                'flex size-11 shrink-0 items-center justify-center rounded-2xl border text-foreground shadow-sm transition-colors',
                entry.isFolder
                  ? 'border-secondary/30 bg-secondary/10'
                  : 'border-border bg-muted'
              )}
            >
              {entry.isFolder ? (
                <FolderOpen
                  data-icon="inline-start"
                  className="size-5 text-secondary"
                />
              ) : (
                <FileIcon data-icon="inline-start" className="size-5" />
              )}
            </div>
            <div
              className="flex flex-1 flex-col gap-1 overflow-hidden"
              aria-describedby={entry.name}
              title={entry.name}
            >
              <CardTitle className="max-w-full truncate text-sm leading-5">
                {entry.name}
              </CardTitle>
              {entry.fileSize && (
                <span className="text-muted-foreground text-xs">
                  {formatFileSize(entry.fileSize)}
                </span>
              )}
            </div>
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="shrink-0">
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
                  onClick={() => onNavigateIntoFolder?.(entry)}
                  className="cursor-pointer gap-2"
                >
                  <FolderOpen />
                  {t('actions.open')}
                </DropdownMenuItem>
              ) : (
                canPreviewInventoryEntry(entry) && (
                  <>
                    <DropdownMenuItem
                      onClick={() => onPreview?.(entry)}
                      className="cursor-pointer gap-2"
                    >
                      <Eye />
                      {t('actions.preview')}
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => onShare?.(entry)}
                      className="cursor-pointer gap-2"
                    >
                      <Share2 />
                      {t('actions.share')}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDownload?.(entry)}
                      className="cursor-pointer gap-2"
                    >
                      <Download />
                      {t('actions.download')}
                    </DropdownMenuItem>
                  </>
                )
              )}
              <DropdownMenuItem
                onClick={() => onDelete(entry)}
                className="cursor-pointer gap-2 text-destructive focus:text-destructive"
              >
                <Trash2 />
                {t('actions.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      {!entry.isFolder && (
        <CardContent className="p-0">
          {isImagePreview && previewUrlQuery.data && !previewImageFailed ? (
            <Image
              src={previewUrlQuery.data}
              alt={entry.name}
              width={640}
              height={360}
              unoptimized
              onError={() => setPreviewImageFailed(true)}
              className="h-36 object-cover"
            />
          ) : (
            <div className="flex h-36 w-full items-center justify-center border border-border/60 bg-muted text-muted-foreground">
              <FileIcon className="size-6" />
            </div>
          )}
        </CardContent>
      )}

      <CardFooter className="flex items-center justify-between gap-2 bg-muted/30">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={entry.isFolder ? 'secondary' : 'outline'}>
            {entry.isFolder ? t('fileCard.folder') : getEntryTypeLabel(entry)}
          </Badge>
          {!entry.isFolder && entry.status === 'UPLOADING' && (
            <div className="min-w-36 space-y-1">
              <Progress value={uploadProgress} className="h-2 animate-pulse" />
              {uploadProgress && (
                <div className="text-[11px] text-muted-foreground">
                  {t('fileCard.uploadProgress', {
                    progress: uploadProgress,
                  })}
                </div>
              )}
            </div>
          )}
        </div>
        <span className="text-muted-foreground text-xs">
          {formatDate(entry.createdAt, locale)}
        </span>
      </CardFooter>
    </Card>
  );
}
