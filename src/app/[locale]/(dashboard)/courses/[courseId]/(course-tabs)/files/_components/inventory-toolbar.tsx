import { FolderPlus, RefreshCw, Search, Upload } from 'lucide-react';
import type { InventoryTranslations } from '@/app/[locale]/(dashboard)/inventory/inventory.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type InventoryToolbarProps = {
  isFetching: boolean;
  isStorageLimitReached: boolean;
  onRefresh: () => void;
  onSearchChange: (value: string) => void;
  onUploadOpen: () => void;
  onCreateFolder: () => void;
  search: string;
  t: InventoryTranslations;
};

export function InventoryToolbar({
  isFetching,
  isStorageLimitReached,
  onCreateFolder,
  onRefresh,
  onSearchChange,
  onUploadOpen,
  search,
  t,
}: InventoryToolbarProps) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t('toolbar.searchPlaceholder')}
          className="pl-9"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={onRefresh}>
          <RefreshCw
            data-icon="inline-start"
            className={cn(isFetching && 'animate-spin')}
          />
          {isFetching ? t('toolbar.refreshing') : t('toolbar.refresh')}
        </Button>
        <Button variant="outline" size="sm" onClick={onCreateFolder}>
          <FolderPlus data-icon="inline-start" />
          {t('actions.newFolder')}
        </Button>
        <Button
          size="sm"
          onClick={onUploadOpen}
          disabled={isStorageLimitReached}
        >
          <Upload data-icon="inline-start" />
          {t('actions.upload')}
        </Button>
      </div>
    </div>
  );
}
