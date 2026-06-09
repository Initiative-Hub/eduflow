import {
  Check,
  ChevronLeft,
  FileText,
  Loader2,
  type LucideIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { InventoryEntry } from '../../../../inventory/inventory.types';
import { formatFileSize } from '../../../../inventory/inventory.utils';

type ResourceBrowserProps = {
  entries?: { data: InventoryEntry[] } | undefined;
  isLoading: boolean;
  currentParentId: string | null;
  pathName: string;
  selectedId: string | null;
  onBack: () => void;
  onEntryClick: (entry: InventoryEntry) => void;
  emptyIcon: LucideIcon;
  emptyTitle: string;
  emptyDescription: string;
};

export function ResourceBrowser({
  entries,
  isLoading,
  currentParentId,
  pathName,
  selectedId,
  onBack,
  onEntryClick,
  emptyIcon: EmptyIcon,
  emptyTitle,
  emptyDescription,
}: ResourceBrowserProps) {
  const t = useTranslations('Courses.CourseModules.AiDialog');

  return (
    <div className="flex h-112.5 flex-col outline-none">
      <div className="flex items-center justify-between border-b bg-muted/20 px-4 py-2">
        <div className="flex items-center gap-2">
          {currentParentId !== null && (
            <Button variant="ghost" size="icon-sm" onClick={onBack}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          <span className="font-medium text-muted-foreground text-sm">
            {pathName}
          </span>
        </div>
        {selectedId && (
          <span className="flex items-center gap-1 font-medium text-primary text-xs">
            <Check className="h-3 w-3" />
            {t('selectedPdf', { count: 1 })}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex h-95 flex-col items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm">{t('loadingFiles')}</p>
          </div>
        ) : entries?.data.length ? (
          <div className="grid grid-cols-2 gap-4 p-4 lg:grid-cols-3">
            {entries.data.map((file) => {
              const isPdf = file.mimeType === 'application/pdf';
              const isSelected = selectedId === file.id;
              const canClick = file.isFolder || isPdf;

              return (
                <div
                  key={file.id}
                  onClick={() => canClick && onEntryClick(file)}
                  className={cn(
                    'group relative flex items-center gap-3 rounded-lg border bg-background p-3 transition-all',
                    canClick
                      ? 'cursor-pointer hover:border-primary/50 hover:shadow-sm'
                      : 'cursor-not-allowed opacity-50 grayscale',
                    isSelected && 'border-primary ring-1 ring-primary'
                  )}
                >
                  <div
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded bg-primary/5 text-primary transition-colors',
                      canClick &&
                        'group-hover:bg-primary group-hover:text-white',
                      isSelected && 'bg-primary text-white'
                    )}
                  >
                    {file.isFolder ? (
                      <EmptyIcon className="h-5 w-5" />
                    ) : (
                      <FileText className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <p className="truncate font-medium text-sm">{file.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {file.isFolder
                        ? t('folder')
                        : formatFileSize(file.fileSize ?? 0)}
                    </p>
                  </div>
                  {isSelected && (
                    <div className="absolute top-2 right-2 rounded-full bg-primary p-0.5 text-white">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-4 py-24 text-center">
            <div className="rounded-full bg-background p-6 shadow-sm ring-1 ring-border/50">
              <EmptyIcon className="h-10 w-10 text-primary/60" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-xl">{emptyTitle}</h3>
              <p className="mx-auto max-w-[320px] text-muted-foreground text-sm">
                {emptyDescription}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
