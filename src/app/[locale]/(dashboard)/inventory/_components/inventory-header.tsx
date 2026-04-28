import { HardDrive } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { formatFileSize } from '../inventory.utils';
import type { InventoryAnalytics } from '../types';
import type { InventoryTranslations } from './inventory.types';

type InventoryHeaderProps = {
  analytics?: InventoryAnalytics;
  isStorageLimitReached: boolean;
  totalItems: number;
  storagePercentage: number;
  storageUsageLabel: string;
  storageUsed: number;
  t: InventoryTranslations;
};

export function InventoryHeader({
  analytics,
  isStorageLimitReached,
  totalItems,
  storagePercentage,
  storageUsageLabel,
  storageUsed,
  t,
}: InventoryHeaderProps) {
  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[1.3fr_0.9fr] xl:items-start">
        <div className="space-y-3">
          <h1 className="font-heading text-2xl md:text-3xl">{t('title')}</h1>
          <p className="max-w-2xl text-muted-foreground text-sm md:text-base">
            {t('hero.description')}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4 xl:grid-cols-2">
          <div className="space-y-1 border-border/60 sm:border-r sm:pr-4 xl:border-r-0 xl:pr-0">
            <p className="text-muted-foreground text-xs">{t('stats.files')}</p>
            <p className="font-heading text-xl">{analytics?.fileCount ?? 0}</p>
          </div>
          <div className="space-y-1 border-border/60 sm:border-r sm:pr-4 xl:border-r-0 xl:pr-0">
            <p className="text-muted-foreground text-xs">
              {t('stats.folders')}
            </p>
            <p className="font-heading text-xl">
              {analytics?.folderCount ?? 0}
            </p>
          </div>
          <div className="space-y-1 border-border/60 sm:border-r sm:pr-4 xl:border-r-0 xl:pr-0">
            <p className="flex items-center gap-1.5 text-muted-foreground text-xs">
              <HardDrive className="size-3.5" />
              {t('stats.storage')}
            </p>
            <p className="font-heading text-xl">
              {formatFileSize(storageUsed)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs">
              {t('stats.currentFolder')}
            </p>
            <p className="font-heading text-xl">{totalItems}</p>
          </div>
        </div>
      </div>

      <div className="space-y-2 border-border/60 border-t pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="font-medium">{t('storage.label')}</span>
          <span
            className={cn(
              'text-muted-foreground',
              isStorageLimitReached && 'text-destructive'
            )}
          >
            {storageUsageLabel}
          </span>
        </div>
        <Progress value={storagePercentage} />
        {isStorageLimitReached && (
          <p className="text-destructive text-sm">
            {t('storage.limitReached')}
          </p>
        )}
      </div>
    </div>
  );
}
