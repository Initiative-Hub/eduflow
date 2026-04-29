'use client';

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
import { useTranslations } from 'next-intl';
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
import { cn } from '@/lib/utils';
import {
  formatDate,
  formatFileSize,
  getEntryTypeLabel,
  isPreviewableEntry,
} from './inventory.utils';
import type { InventoryEntry } from './types';

interface FileCardProps {
  entry: InventoryEntry;
  locale: string;
  onOpen: (entry: InventoryEntry) => void;
  onRename: (entry: InventoryEntry) => void;
  onMove: (entry: InventoryEntry) => void;
  onShare: (entry: InventoryEntry) => void;
  onPreview: (entry: InventoryEntry) => void;
  onDownload: (entry: InventoryEntry) => void;
  onDelete: (entry: InventoryEntry) => void;
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
}: FileCardProps) {
  const t = useTranslations('InventoryPage');
  const previewable = isPreviewableEntry(entry);

  return (
    <Card className="group/card border-border/70 bg-card/90 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <CardHeader className="gap-3 border-border/60 border-b pb-4">
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            className="flex min-w-0 flex-1 items-start gap-3 text-left"
            onClick={() => onOpen(entry)}
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
            <div className="min-w-0 space-y-1">
              <CardTitle className="truncate text-sm leading-5">
                {entry.name}
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={entry.isFolder ? 'secondary' : 'outline'}>
                  {entry.isFolder
                    ? t('fileCard.folder')
                    : getEntryTypeLabel(entry)}
                </Badge>
                {!entry.isFolder && (
                  <Badge variant="outline">
                    {entry.status === 'READY'
                      ? t('fileCard.ready')
                      : t('fileCard.processing')}
                  </Badge>
                )}
              </div>
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
              {!entry.isFolder && (
                <>
                  {previewable && (
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
                </>
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

      <CardContent className="space-y-3 pt-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl border border-border/60 bg-muted/40 px-3 py-2">
            <div className="text-muted-foreground text-xs">
              {t('fileCard.type')}
            </div>
            <div className="font-medium">{getEntryTypeLabel(entry)}</div>
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/40 px-3 py-2">
            <div className="text-muted-foreground text-xs">
              {t('fileCard.size')}
            </div>
            <div className="font-medium">{formatFileSize(entry.fileSize)}</div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between gap-2 bg-muted/30">
        <div className="text-muted-foreground text-xs">
          {formatDate(entry.createdAt, locale)}
        </div>
        <Button
          variant={entry.isFolder ? 'secondary' : 'outline'}
          size="sm"
          className="ml-auto"
          onClick={() => onOpen(entry)}
        >
          {entry.isFolder
            ? t('actions.open')
            : previewable
              ? t('actions.preview')
              : t('actions.download')}
        </Button>
      </CardFooter>
    </Card>
  );
}
