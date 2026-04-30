import type { InventoryEntry } from './inventory.types';

export const formatFileSize = (bytes: number | null) => {
  if (bytes === null) return '—';
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(
    sizes.length - 1,
    Math.floor(Math.log(bytes) / Math.log(k))
  );

  return `${Math.round((bytes / k ** index) * 100) / 100} ${sizes[index]}`;
};

export const formatDate = (value: string, locale: string) => {
  return new Date(value).toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const getFileExtension = (fileName: string) => {
  const extension = fileName.split('.').pop();
  if (!extension) return 'FILE';
  return extension.toUpperCase().slice(0, 4);
};

export const getEntryTypeLabel = (entry: InventoryEntry) => {
  if (entry.isFolder) return 'Folder';
  if (!entry.extension) return 'File';
  return entry.extension.toUpperCase();
};
