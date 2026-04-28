'use client';

import {
  Download,
  Edit2,
  Eye,
  MoreVertical,
  Move,
  Share2,
  Trash2,
} from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { StorageFile } from '@/stores/useStorageStore';

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

const getFileExtension = (fileName: string) => {
  const extension = fileName.split('.').pop();
  if (!extension) return 'FILE';
  return extension.toUpperCase().slice(0, 4);
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

interface FileCardProps {
  file: StorageFile;
  locale: string;
  onDelete: (fileId: string) => void;
  onRename: (fileId: string) => void;
  onMove: (fileId: string) => void;
  onShare: (fileId: string) => void;
  onPreview: (file: StorageFile) => void;
}

export function FileCard({
  file,
  locale,
  onDelete,
  onRename,
  onMove,
  onShare,
  onPreview,
}: FileCardProps) {
  const t = useTranslations('InventoryPage');
  const isImage = file.type.startsWith('image/');

  const handleDownload = () => {
    downloadFile(file);
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 transition-shadow hover:shadow-md">
      <div
        className="mb-3 flex h-40 w-full cursor-pointer items-center justify-center overflow-hidden rounded-md bg-muted"
        onClick={() => onPreview(file)}
      >
        {isImage && file.data ? (
          <Image
            src={file.data}
            alt={file.name}
            width={400}
            height={400}
            unoptimized
            className="h-full w-full object-cover transition-transform hover:scale-105"
          />
        ) : (
          <div className="font-semibold text-2xl text-muted-foreground">
            {getFileExtension(file.name)}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="flex-1 truncate font-medium text-foreground text-sm">
            {file.name}
          </h3>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem
                onClick={() => onRename(file.id)}
                className="cursor-pointer gap-2"
              >
                <Edit2 size={14} />
                {t('actions.rename')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onMove(file.id)}
                className="cursor-pointer gap-2"
              >
                <Move size={14} />
                {t('actions.move')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onShare(file.id)}
                className="cursor-pointer gap-2"
              >
                <Share2 size={14} />
                {t('actions.share')}
              </DropdownMenuItem>
              {isImage && (
                <DropdownMenuItem
                  onClick={() => onPreview(file)}
                  className="cursor-pointer gap-2"
                >
                  <Eye size={14} />
                  {t('actions.preview')}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={handleDownload}
                className="cursor-pointer gap-2"
              >
                <Download size={14} />
                {t('actions.download')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(file.id)}
                className="cursor-pointer gap-2 text-destructive focus:text-destructive"
              >
                <Trash2 size={14} />
                {t('actions.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <p className="text-muted-foreground text-xs">
          {formatFileSize(file.size)}
        </p>
        <p className="text-muted-foreground text-xs">
          {formatDate(file.createdAt, locale)}
        </p>
      </div>
    </div>
  );
}
