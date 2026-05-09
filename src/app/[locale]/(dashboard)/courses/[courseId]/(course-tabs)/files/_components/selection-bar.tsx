import { Share2, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { InventoryTranslations } from '@/app/[locale]/(dashboard)/inventory/inventory.types';

type SelectionBarProps = {
  hasSelectedFiles: boolean;
  onClearSelection: () => void;
  onDeleteSelected: () => void;
  onShareSelected: () => void;
  selectedEntriesCount: number;
  selectionCount: number;
  t: InventoryTranslations;
};

export function SelectionBar({
  hasSelectedFiles,
  onClearSelection,
  onDeleteSelected,
  onShareSelected,
  selectedEntriesCount,
  selectionCount,
  t,
}: SelectionBarProps) {
  if (selectionCount === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-muted/70 px-4 py-3">
      <div className="flex items-center gap-2 text-sm">
        <Badge variant="outline">{selectionCount}</Badge>
        <span>{t('selection.label', { count: selectionCount })}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onShareSelected}
          disabled={!hasSelectedFiles}
        >
          <Share2 data-icon="inline-start" />
          {t('actions.shareSelected')}
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={onDeleteSelected}
          disabled={selectedEntriesCount === 0}
        >
          <Trash2 data-icon="inline-start" />
          {t('actions.deleteSelected')}
        </Button>
        <Button variant="ghost" size="sm" onClick={onClearSelection}>
          {t('actions.clearSelection')}
        </Button>
      </div>
    </div>
  );
}
