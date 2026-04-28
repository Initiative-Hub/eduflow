import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  downloadInventoryObject: vi.fn(),
  buildInventoryObjectKey: vi.fn(),
  checkInventoryObjectExists: vi.fn(),
  createInventoryReadSignedUrl: vi.fn(),
  createInventoryWriteSignedUrl: vi.fn(),
  deleteInventoryObject: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    fileInventory: {
      findFirst: mocks.findFirst,
    },
  },
}));

vi.mock('@/lib/storage/file-storage', () => ({
  buildInventoryObjectKey: mocks.buildInventoryObjectKey,
  checkInventoryObjectExists: mocks.checkInventoryObjectExists,
  createInventoryReadSignedUrl: mocks.createInventoryReadSignedUrl,
  createInventoryWriteSignedUrl: mocks.createInventoryWriteSignedUrl,
  deleteInventoryObject: mocks.deleteInventoryObject,
  downloadInventoryObject: mocks.downloadInventoryObject,
  FILE_INVENTORY_BUCKET_NAME: 'eduflow-inventory',
}));

import { StorageService } from '@/services/StorageService';

describe('StorageService.getDownloadPayload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('downloads an existing file even when the record is not ready yet', async () => {
    mocks.findFirst.mockImplementation(async (args: any) => {
      if (args?.where?.status === 'READY') {
        return null;
      }

      return {
        name: 'Research_Paper.pdf',
        objectKey: 'inventories/user-1/research-paper.pdf',
      };
    });

    mocks.downloadInventoryObject.mockResolvedValue({
      bytes: new Uint8Array([1, 2, 3]),
      contentType: 'application/pdf',
    });

    const result = await StorageService.getDownloadPayload({
      userId: 'user-1',
      fileId: 'file-1',
    });

    expect(result.fileName).toBe('Research_Paper.pdf');
    expect(result.contentType).toBe('application/pdf');
    expect(Array.from(result.bytes)).toEqual([1, 2, 3]);
    expect(mocks.downloadInventoryObject).toHaveBeenCalledWith({
      objectKey: 'inventories/user-1/research-paper.pdf',
    });
  });
});
