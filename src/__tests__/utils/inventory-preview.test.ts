import { describe, expect, it } from 'vitest';
import type { InventoryEntry } from '@/app/[locale]/(dashboard)/inventory/inventory.types';
import {
  canPreviewInventoryEntry,
  getInventoryPreviewKind,
} from '@/app/[locale]/(dashboard)/inventory/inventory.utils';

const baseEntry: InventoryEntry = {
  id: 'file-1',
  userId: 'user-1',
  parentId: null,
  name: 'notes.txt',
  isFolder: false,
  metadata: null,
  status: 'READY',
  fileSize: 128,
  mimeType: 'text/plain',
  extension: 'txt',
  bucket: 'inventory',
  objectKey: 'notes.txt',
  checksumSha256: null,
  vectorDbId: null,
  createdAt: '2026-07-03T00:00:00.000Z',
  updatedAt: '2026-07-03T00:00:00.000Z',
  uploadedAt: '2026-07-03T00:00:00.000Z',
  deletedAt: null,
  thumbnailObjectKey: null,
  thumbnailMimeType: null,
};

const entry = (overrides: Partial<InventoryEntry>): InventoryEntry => ({
  ...baseEntry,
  ...overrides,
});

describe('inventory preview helpers', () => {
  it('classifies images, PDFs, and text documents for inline preview', () => {
    expect(
      getInventoryPreviewKind(
        entry({ mimeType: 'image/png', extension: 'png' })
      )
    ).toBe('image');
    expect(
      getInventoryPreviewKind(
        entry({ mimeType: 'application/pdf', extension: 'pdf' })
      )
    ).toBe('pdf');
    expect(
      getInventoryPreviewKind(
        entry({ mimeType: 'text/markdown', extension: 'md' })
      )
    ).toBe('text');
  });

  it('uses common text extensions when the browser omits a useful MIME type', () => {
    expect(
      getInventoryPreviewKind(
        entry({ name: 'README.md', mimeType: null, extension: 'md' })
      )
    ).toBe('text');
    expect(
      getInventoryPreviewKind(
        entry({
          name: 'config.json',
          mimeType: 'application/octet-stream',
          extension: 'json',
        })
      )
    ).toBe('text');
  });

  it('only previews ready files with a supported inline preview kind', () => {
    expect(canPreviewInventoryEntry(baseEntry)).toBe(true);
    expect(canPreviewInventoryEntry(entry({ isFolder: true }))).toBe(false);
    expect(canPreviewInventoryEntry(entry({ status: 'UPLOADING' }))).toBe(
      false
    );
    expect(
      canPreviewInventoryEntry(
        entry({ mimeType: 'application/zip', extension: 'zip' })
      )
    ).toBe(false);
  });
});
