import type { InventoryEntry } from './inventory.types';

export type InventoryPreviewKind = 'image' | 'pdf' | 'text';

const TEXT_PREVIEW_EXTENSIONS = new Set([
  'txt',
  'md',
  'markdown',
  'json',
  'csv',
  'tsv',
  'xml',
  'yaml',
  'yml',
  'html',
  'css',
  'js',
  'jsx',
  'ts',
  'tsx',
  'sql',
  'log',
]);

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

export const getInventoryPreviewKind = (
  entry: InventoryEntry
): InventoryPreviewKind | null => {
  if (entry.isFolder) return null;

  const mimeType = entry.mimeType?.toLowerCase() ?? '';
  const extension = entry.extension?.toLowerCase() ?? '';

  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf' || extension === 'pdf') return 'pdf';

  if (
    mimeType.startsWith('text/') ||
    mimeType === 'application/json' ||
    mimeType === 'application/xml' ||
    mimeType === 'application/javascript' ||
    mimeType === 'application/typescript' ||
    TEXT_PREVIEW_EXTENSIONS.has(extension)
  ) {
    return 'text';
  }

  return null;
};
