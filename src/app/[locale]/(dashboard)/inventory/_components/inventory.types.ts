import type { InventoryEntry } from '../types';

export type InventoryTranslations = ReturnType<
  typeof import('next-intl').useTranslations
>;

export type InventoryActionHandlers = {
  onDeleteEntry: (entry: InventoryEntry) => void;
  onDownload: (entry: InventoryEntry) => void;
  onMove: (entry: InventoryEntry) => void;
  onNavigateIntoFolder: (entry: InventoryEntry) => void;
  onOpen: (entry: InventoryEntry) => void;
  onPreview: (entry: InventoryEntry) => void;
  onRename: (entry: InventoryEntry) => void;
  onShare: (entry: InventoryEntry) => void;
};
