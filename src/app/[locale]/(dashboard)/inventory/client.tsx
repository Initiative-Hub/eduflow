'use client';

import {
  Download,
  Edit2,
  Eye,
  FileIcon,
  MoreVertical,
  Move,
  Plus,
  Share2,
  Trash2,
} from 'lucide-react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
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
import { Progress } from '@/components/ui/progress';
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
import type { StorageFile, StorageFolder } from '@/stores/useStorageStore';
import { FileCard } from './file-card';
import { useInventory } from './use-inventory';

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round((bytes / k ** i) * 100) / 100} ${sizes[i]}`;
};

const formatDate = (date: Date, locale: string) => {
  return new Date(date).toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const downloadFile = (file: StorageFile) => {
  if (!file.data) return;
  const blob = new Blob([file.data], { type: file.type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = file.name;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

const getFileExtension = (fileName: string) => {
  const extension = fileName.split('.').pop();
  if (!extension) return 'FILE';
  return extension.toUpperCase().slice(0, 4);
};

const initialFolders: Record<string, StorageFolder> = {
  root: {
    id: 'root',
    name: 'Storage',
    parentId: null,
    children: [],
    createdAt: new Date(),
  },
};

const initialFiles: StorageFile[] = [
  {
    id: '1',
    name: 'Lecture_Notes.pdf',
    type: 'application/pdf',
    size: 2450000,
    folderId: 'root',
    createdAt: new Date(),
  },
  {
    id: '2',
    name: 'Project_Structure.png',
    type: 'image/png',
    size: 1200000,
    folderId: 'root',
    createdAt: new Date(),
    data: 'https://images.unsplash.com/photo-1614741118887-7a4ee193a5fa?w=400&auto=format&fit=crop&q=60',
  },
  {
    id: '3',
    name: 'Research_Paper.docx',
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    size: 850000,
    folderId: 'root',
    createdAt: new Date(),
  },
];

export function InventoryClient() {
  const t = useTranslations('InventoryPage');
  const locale = useLocale();
  const {
    files,
    viewType,
    renameDialog,
    setViewType,
    setRenameDialog,
    handleDelete,
    handleRenameClick,
    handleRenameSubmit,
    handleMove,
    handleShare,
    handlePreview,
  } = useInventory(initialFiles, initialFolders);

  const storageLimitBytes = 5 * 1024 * 1024 * 1024;
  const totalStorageBytes = useMemo(
    () => files.reduce((total, file) => total + file.size, 0),
    [files]
  );
  const storagePercentage =
    storageLimitBytes === 0
      ? 0
      : Math.min(100, (totalStorageBytes / storageLimitBytes) * 100);
  const isStorageLimitReached = totalStorageBytes >= storageLimitBytes;
  const storageUsageLabel = t('storage.usage', {
    used: formatFileSize(totalStorageBytes),
    total: formatFileSize(storageLimitBytes),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h2 className="font-bold text-3xl tracking-tight">{t('title')}</h2>
          <div className="max-w-md space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>{t('storage.label')}</div>
              <span
                className={cn(
                  'text-muted-foreground text-sm',
                  isStorageLimitReached && 'text-destructive'
                )}
              >
                {storageUsageLabel}
              </span>
            </div>
            <Progress value={storagePercentage} />
            {isStorageLimitReached && (
              <div className="text-destructive text-sm">
                {t('storage.limitReached')}
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Tabs
            value={viewType}
            onValueChange={(value) =>
              setViewType(value === 'list' ? 'list' : 'grid')
            }
          >
            <TabsList>
              <TabsTrigger value="grid">{t('view.grid')}</TabsTrigger>
              <TabsTrigger value="list">{t('view.list')}</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button disabled={isStorageLimitReached}>
            <Plus data-icon="inline-start" />
            {t('uploadFile')}
          </Button>
        </div>
      </div>

      <div
        className={cn(
          viewType === 'grid'
            ? 'grid gap-4 md:grid-cols-2 lg:grid-cols-4'
            : 'flex flex-col gap-4'
        )}
      >
        {viewType === 'grid' &&
          files.map((file) => (
            <FileCard
              key={file.id}
              file={file}
              locale={locale}
              onDelete={handleDelete}
              onRename={handleRenameClick}
              onMove={handleMove}
              onShare={handleShare}
              onPreview={handlePreview}
            />
          ))}
        {viewType === 'list' && files.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('list.columns.name')}</TableHead>
                <TableHead>{t('list.columns.reason')}</TableHead>
                <TableHead>{t('list.columns.owner')}</TableHead>
                <TableHead>{t('list.columns.location')}</TableHead>
                <TableHead className="text-right">
                  <span className="sr-only">{t('list.columns.actions')}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {files.map((file) => {
                const isImage = file.type.startsWith('image/');
                const fileDate = formatDate(file.createdAt, locale);

                return (
                  <TableRow key={file.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {isImage && file.data ? (
                          <div className="flex size-9 items-center justify-center overflow-hidden rounded-md bg-muted">
                            <Image
                              src={file.data}
                              alt={file.name}
                              width={36}
                              height={36}
                              unoptimized
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="flex size-9 items-center justify-center rounded-md bg-muted font-semibold text-[10px] text-muted-foreground">
                            {getFileExtension(file.name)}
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">
                            {file.name}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            {formatFileSize(file.size)}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {t('list.reason.created', { date: fileDate })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex size-6 items-center justify-center rounded-full bg-muted font-semibold text-[10px] text-muted-foreground">
                          {t('list.owner.youShort')}
                        </div>
                        <span>{t('list.owner.you')}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {t('list.location.myDrive')}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <MoreVertical size={16} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem
                            onClick={() => handleRenameClick(file.id)}
                            className="cursor-pointer gap-2"
                          >
                            <Edit2 size={14} />
                            {t('actions.rename')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleMove(file.id)}
                            className="cursor-pointer gap-2"
                          >
                            <Move size={14} />
                            {t('actions.move')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleShare(file.id)}
                            className="cursor-pointer gap-2"
                          >
                            <Share2 size={14} />
                            {t('actions.share')}
                          </DropdownMenuItem>
                          {isImage && (
                            <DropdownMenuItem
                              onClick={() => handlePreview(file)}
                              className="cursor-pointer gap-2"
                            >
                              <Eye size={14} />
                              {t('actions.preview')}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => downloadFile(file)}
                            className="cursor-pointer gap-2"
                          >
                            <Download size={14} />
                            {t('actions.download')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(file.id)}
                            className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                          >
                            <Trash2 size={14} />
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
        )}
      </div>

      {files.length === 0 && (
        <Empty className="min-h-100">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileIcon />
            </EmptyMedia>
            <EmptyTitle>{t('empty.title')}</EmptyTitle>
            <EmptyDescription>{t('empty.description')}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" disabled={isStorageLimitReached}>
              {t('empty.action')}
            </Button>
          </EmptyContent>
        </Empty>
      )}

      <Dialog
        open={renameDialog.open}
        onOpenChange={(open) =>
          setRenameDialog((prev) =>
            open ? { ...prev, open } : { open: false, fileId: null, value: '' }
          )
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('renameDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('renameDialog.description')}
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="rename-file-name">
                {t('renameDialog.label')}
              </FieldLabel>
              <FieldContent>
                <Input
                  id="rename-file-name"
                  value={renameDialog.value}
                  onChange={(event) =>
                    setRenameDialog((prev) => ({
                      ...prev,
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
              disabled={!renameDialog.value.trim()}
            >
              {t('actions.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
