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
import {
  formatDate,
  formatFileSize,
  getEntryTypeLabel,
} from '../inventory.utils';
import type { InventoryEntry } from '../types';
import type {
  InventoryActionHandlers,
  InventoryTranslations,
} from './inventory.types';

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

type InventoryTableViewProps = InventoryActionHandlers & {
  entries: InventoryEntry[];
  getUploadProgress: (entryId: string) => number | undefined;
  locale: string;
  onSelectAll: (checked: boolean) => void;
  onSelectEntry: (entryId: string, checked: boolean) => void;
  selectedIds: string[];
  selectionCount: number;
  t: InventoryTranslations;
};

export function InventoryTableView({
  t,
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
  onSelectAll,
  onSelectEntry,
  onShare,
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
            return (
              <TableRow key={entry.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedIds.includes(entry.id)}
                    onCheckedChange={(checked) =>
                      onSelectEntry(entry.id, Boolean(checked))
                    }
                    aria-label={t('selection.toggleItem', { name: entry.name })}
                  />
                </TableCell>
                <TableCell>
                  <button
                    type="button"
                    onClick={() => onOpen(entry)}
                    className="flex items-center gap-3 text-left"
                  >
                    <div className="flex size-9 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      {entry.isFolder ? <FolderOpen /> : <FileIcon />}
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
                            <DropdownMenuItem
                              onClick={() => onPreview(entry)}
                              className="cursor-pointer gap-2"
                            >
                              <Eye />
                              {t('actions.preview')}
                            </DropdownMenuItem>

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
                        )
                      )}
                      <DropdownMenuItem
                        onClick={() => onDeleteEntry(entry)}
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
  );
}
