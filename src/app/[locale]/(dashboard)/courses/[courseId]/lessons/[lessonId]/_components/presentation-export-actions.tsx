'use client';

import { ChevronDown, CloudUpload, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useGoogleDriveExport } from '@/hooks/use-google-drive-export';
import { useOneDriveExport } from '@/hooks/use-onedrive-export';

type PresentationExportActionsProps = {
  isDownloading: boolean;
  lessonId: string;
  onDownloadNative: () => void;
  t: (key: string) => string;
};

export function PresentationExportActions({
  isDownloading,
  lessonId,
  onDownloadNative,
  t,
}: PresentationExportActionsProps) {
  const googleDriveExport = useGoogleDriveExport();
  const oneDriveExport = useOneDriveExport();
  const isPending =
    isDownloading || googleDriveExport.isPending || oneDriveExport.isPending;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className="min-h-11 gap-1.5 rounded-lg"
          disabled={isPending}
          size="sm"
          variant="outline"
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          {googleDriveExport.isPending || oneDriveExport.isPending
            ? t('savingToDrive')
            : isDownloading
              ? t('pptxDownloading')
              : t('exportMenu')}
          <ChevronDown className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem className="min-h-11" onSelect={onDownloadNative}>
          <Download aria-hidden="true" />
          {t('btnDownloadPptx')}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="min-h-11"
          onSelect={() =>
            googleDriveExport.mutate({
              kind: 'lesson_presentation',
              lessonId,
            })
          }
        >
          <CloudUpload aria-hidden="true" />
          {t('savePptxToDrive')}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="min-h-11"
          onSelect={() =>
            oneDriveExport.mutate({
              kind: 'lesson_presentation',
              lessonId,
            })
          }
        >
          <CloudUpload aria-hidden="true" />
          {t('savePptxToOneDrive')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
