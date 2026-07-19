import { FolderOpen, Search } from 'lucide-react';
import type { InventoryTranslations } from '@/app/[locale]/(dashboard)/inventory/inventory.types';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

type InventoryEmptyStateProps = {
  isSearching: boolean;
  isStorageLimitReached: boolean;
  onClearSearch: () => void;
  onCreateFolder: () => void;
  onUploadOpen: () => void;
  t: InventoryTranslations;
};

export function InventoryEmptyState({
  isSearching,
  isStorageLimitReached,
  onClearSearch,
  onCreateFolder,
  onUploadOpen,
  t,
}: InventoryEmptyStateProps) {
  return (
    <Empty className="min-h-105 border-border/60 bg-muted/20">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          {isSearching ? <Search /> : <FolderOpen />}
        </EmptyMedia>
        <EmptyTitle>
          {isSearching ? t('emptySearch.title') : t('empty.title')}
        </EmptyTitle>
        <EmptyDescription>
          {isSearching ? t('emptySearch.description') : t('empty.description')}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        {isSearching ? (
          <Button variant="outline" onClick={onClearSearch}>
            {t('emptySearch.clear')}
          </Button>
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button variant="outline" onClick={onCreateFolder}>
              {t('empty.createFolder')}
            </Button>
            <Button onClick={onUploadOpen} disabled={isStorageLimitReached}>
              {t('empty.action')}
            </Button>
          </div>
        )}
      </EmptyContent>
    </Empty>
  );
}
