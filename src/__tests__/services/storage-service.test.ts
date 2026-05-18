import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import {
  buildInventoryObjectKey,
  createInventoryReadSignedUrl,
  createInventoryWriteSignedUrl,
  deleteInventoryObject,
  downloadInventoryObject,
  getInventoryObjectMetadata,
} from '@/lib/storage/file-storage';
import { StorageService } from '@/services/StorageService';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    fileInventory: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      updateMany: vi.fn(),
      aggregate: vi.fn(),
    },
  },
}));

vi.mock('@/lib/storage/file-storage', () => ({
  STORAGE_MAX_FILE_SIZE_BYTES: 50 * 1024 * 1024,
  FILE_INVENTORY_BUCKET_NAME: 'eduflow-inventory',
  buildInventoryObjectKey: vi.fn(),
  getInventoryObjectMetadata: vi.fn(),
  downloadInventoryObject: vi.fn(),
  deleteInventoryObject: vi.fn(),
  createInventoryReadSignedUrl: vi.fn(),
  createInventoryWriteSignedUrl: vi.fn(),
}));

const fileInventory = prisma.fileInventory as unknown as Record<
  string,
  ReturnType<typeof vi.fn>
>;
const mockBuildInventoryObjectKey = buildInventoryObjectKey as ReturnType<
  typeof vi.fn
>;
const mockGetInventoryObjectMetadata = getInventoryObjectMetadata as ReturnType<
  typeof vi.fn
>;
const mockCreateInventoryReadSignedUrl =
  createInventoryReadSignedUrl as ReturnType<typeof vi.fn>;
const mockCreateInventoryWriteSignedUrl =
  createInventoryWriteSignedUrl as ReturnType<typeof vi.fn>;
const mockDeleteInventoryObject = deleteInventoryObject as ReturnType<
  typeof vi.fn
>;
const mockDownloadInventoryObject = downloadInventoryObject as ReturnType<
  typeof vi.fn
>;

describe('StorageService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listDirectory', () => {
    it('returns items and total for root directory', async () => {
      fileInventory.findMany.mockResolvedValue([
        { id: 'f1', fileSize: BigInt(2) },
      ]);
      fileInventory.count.mockResolvedValue(1);

      const result = await StorageService.listDirectory({
        userId: 'u1',
        parentId: null,
        limit: 10,
        offset: 0,
      });

      expect(result.total).toBe(1);
      expect(result.items).toEqual([{ id: 'f1', fileSize: 2 }]);
    });

    it('throws when parent folder is invalid', async () => {
      fileInventory.findFirst.mockResolvedValue(null);

      await expect(
        StorageService.listDirectory({
          userId: 'u1',
          parentId: 'p1',
          limit: 10,
          offset: 0,
        })
      ).rejects.toThrow('Parent folder not found');
    });
  });

  describe('createFolder', () => {
    it('creates a normalized folder name', async () => {
      fileInventory.findFirst.mockResolvedValueOnce(null);
      fileInventory.create.mockResolvedValue({
        id: 'n1',
        fileSize: null,
        name: 'My Folder',
      });

      const result = await StorageService.createFolder({
        userId: 'u1',
        parentId: null,
        name: '  My   Folder  ',
      });

      expect(fileInventory.create).toHaveBeenCalled();
      expect(result.name).toBe('My Folder');
    });

    it('throws on empty folder name', async () => {
      await expect(
        StorageService.createFolder({
          userId: 'u1',
          parentId: null,
          name: '   ',
        })
      ).rejects.toThrow('Folder name is required');
    });

    it('throws when duplicate name exists', async () => {
      fileInventory.findFirst.mockResolvedValueOnce({ id: 'dup' });

      await expect(
        StorageService.createFolder({
          userId: 'u1',
          parentId: null,
          name: 'Docs',
        })
      ).rejects.toThrow('An item with this name already exists');
    });
  });

  describe('initializeUpload', () => {
    it('returns upload session payload', async () => {
      mockBuildInventoryObjectKey.mockReturnValue('inventories/u1/readme.pdf');
      fileInventory.create.mockResolvedValue({ id: 'f1', status: 'UPLOADING' });
      mockCreateInventoryWriteSignedUrl.mockResolvedValue('https://upload');

      const result = await StorageService.initializeUpload({
        userId: 'u1',
        parentId: null,
        fileName: 'readme.pdf',
        contentType: 'application/pdf',
        fileSize: 42,
      });

      expect(result).toEqual({
        id: 'f1',
        status: 'UPLOADING',
        objectKey: 'inventories/u1/readme.pdf',
        bucket: 'eduflow-inventory',
        uploadUrl: 'https://upload',
        uploadHeaders: { 'Content-Type': 'application/pdf' },
      });
    });

    it('throws on empty file name', async () => {
      await expect(
        StorageService.initializeUpload({
          userId: 'u1',
          parentId: null,
          fileName: '   ',
          contentType: 'text/plain',
          fileSize: 1,
        })
      ).rejects.toThrow('File name is required');
    });

    it('throws when file is larger than storage upload limit', async () => {
      await expect(
        StorageService.initializeUpload({
          userId: 'u1',
          parentId: null,
          fileName: 'large.zip',
          contentType: 'application/zip',
          fileSize: 60 * 1024 * 1024,
        })
      ).rejects.toThrow('File size exceeds storage upload limit');
    });
  });

  describe('confirmUpload', () => {
    it('marks upload as ready when object exists', async () => {
      fileInventory.findFirst.mockResolvedValue({
        id: 'f1',
        isFolder: false,
        objectKey: 'obj1',
        fileSize: BigInt(10),
      });
      mockGetInventoryObjectMetadata.mockResolvedValue({
        exists: true,
        contentLength: 10,
      });
      fileInventory.update.mockResolvedValue({
        id: 'f1',
        fileSize: BigInt(10),
        status: 'READY',
      });

      const result = await StorageService.confirmUpload({
        userId: 'u1',
        fileId: 'f1',
      });

      expect(result.status).toBe('READY');
      expect(fileInventory.update).toHaveBeenCalled();
    });

    it('rolls back pending file when object does not exist', async () => {
      fileInventory.findFirst.mockResolvedValue({
        id: 'f1',
        isFolder: false,
        objectKey: 'obj1',
      });
      mockGetInventoryObjectMetadata.mockResolvedValue({
        exists: false,
        contentLength: null,
      });

      await expect(
        StorageService.confirmUpload({ userId: 'u1', fileId: 'f1' })
      ).rejects.toThrow(
        'Uploaded object not found. Database entry rolled back.'
      );
      expect(fileInventory.delete).toHaveBeenCalledWith({
        where: { id: 'f1' },
      });
    });

    it('rolls back when uploaded object exceeds max upload size', async () => {
      fileInventory.findFirst.mockResolvedValue({
        id: 'f1',
        isFolder: false,
        objectKey: 'obj1',
      });
      mockGetInventoryObjectMetadata.mockResolvedValue({
        exists: true,
        contentLength: 60 * 1024 * 1024,
      });

      await expect(
        StorageService.confirmUpload({ userId: 'u1', fileId: 'f1' })
      ).rejects.toThrow('Uploaded object exceeds storage upload limit.');
      expect(fileInventory.delete).toHaveBeenCalledWith({
        where: { id: 'f1' },
      });
    });
  });

  describe('createShareUrl', () => {
    it('returns signed URL for a ready file', async () => {
      fileInventory.findFirst.mockResolvedValue({ objectKey: 'obj1' });
      mockCreateInventoryReadSignedUrl.mockResolvedValue('https://signed');

      const result = await StorageService.createShareUrl({
        userId: 'u1',
        fileId: 'f1',
      });
      expect(result).toBe('https://signed');
    });

    it('throws when file is not found', async () => {
      fileInventory.findFirst.mockResolvedValue(null);
      await expect(
        StorageService.createShareUrl({ userId: 'u1', fileId: 'f1' })
      ).rejects.toThrow('File not found');
    });
  });

  describe('createShareUrlsBatch', () => {
    it('returns empty array for empty input', async () => {
      await expect(
        StorageService.createShareUrlsBatch({ userId: 'u1', fileIds: [] })
      ).resolves.toEqual([]);
    });

    it('returns signed urls for valid files', async () => {
      fileInventory.findMany.mockResolvedValue([
        { id: 'a', objectKey: 'obj-a', name: 'A.pdf' },
        { id: 'b', objectKey: 'obj-b', name: 'B.pdf' },
      ]);
      mockCreateInventoryReadSignedUrl
        .mockResolvedValueOnce('https://signed-a')
        .mockResolvedValueOnce('https://signed-b');

      const result = await StorageService.createShareUrlsBatch({
        userId: 'u1',
        fileIds: ['a', 'a', 'b'],
      });

      expect(result).toEqual([
        { fileId: 'a', name: 'A.pdf', signedUrl: 'https://signed-a' },
        { fileId: 'b', name: 'B.pdf', signedUrl: 'https://signed-b' },
      ]);
    });
  });

  describe('createChatAttachmentUrls', () => {
    it('signs only ready files from the user inventory', async () => {
      fileInventory.findMany.mockResolvedValue([
        {
          bucket: 'eduflow-inventory',
          id: 'f1',
          mimeType: 'application/pdf',
          name: 'Notes.pdf',
          objectKey: 'users/u1/f1.pdf',
        },
      ]);
      mockCreateInventoryReadSignedUrl.mockResolvedValue('signed-url');

      const result = await StorageService.createChatAttachmentUrls({
        userId: 'u1',
        fileIds: ['f1', 'f1'],
      });

      expect(fileInventory.findMany).toHaveBeenCalledWith({
        where: {
          courseId: null,
          deletedAt: null,
          id: { in: ['f1'] },
          isFolder: false,
          status: 'READY',
          userId: 'u1',
        },
        select: {
          bucket: true,
          id: true,
          mimeType: true,
          name: true,
          objectKey: true,
        },
      });
      expect(result).toEqual([
        {
          bucket: 'eduflow-inventory',
          fileId: 'f1',
          mimeType: 'application/pdf',
          name: 'Notes.pdf',
          objectKey: 'users/u1/f1.pdf',
          signedUrl: 'signed-url',
        },
      ]);
    });
  });

  describe('getChatAttachmentPayloads', () => {
    it('downloads only ready files from the user inventory', async () => {
      fileInventory.findMany.mockResolvedValue([
        {
          id: 'f1',
          mimeType: 'application/pdf',
          name: 'Notes.pdf',
          objectKey: 'users/u1/f1.pdf',
        },
      ]);
      mockDownloadInventoryObject.mockResolvedValue({
        bytes: new Uint8Array([1, 2, 3]),
        contentType: 'application/pdf',
      });

      const result = await StorageService.getChatAttachmentPayloads({
        userId: 'u1',
        fileIds: ['f1', 'f1'],
      });

      expect(fileInventory.findMany).toHaveBeenCalledWith({
        where: {
          courseId: null,
          deletedAt: null,
          id: { in: ['f1'] },
          isFolder: false,
          status: 'READY',
          userId: 'u1',
        },
        select: {
          id: true,
          mimeType: true,
          name: true,
          objectKey: true,
        },
      });
      expect(result).toEqual([
        {
          bytes: new Uint8Array([1, 2, 3]),
          fileId: 'f1',
          mimeType: 'application/pdf',
          name: 'Notes.pdf',
          objectKey: 'users/u1/f1.pdf',
        },
      ]);
    });
  });

  describe('getDownloadPayload', () => {
    it('downloads and returns payload data', async () => {
      fileInventory.findFirst.mockResolvedValue({
        name: 'Research_Paper.pdf',
        objectKey: 'obj1',
      });
      mockDownloadInventoryObject.mockResolvedValue({
        bytes: new Uint8Array([1, 2, 3]),
        contentType: 'application/pdf',
      });

      const result = await StorageService.getDownloadPayload({
        userId: 'u1',
        fileId: 'f1',
      });
      expect(result).toEqual({
        fileName: 'Research_Paper.pdf',
        bytes: new Uint8Array([1, 2, 3]),
        contentType: 'application/pdf',
      });
    });

    it('throws when file cannot be found', async () => {
      fileInventory.findFirst.mockResolvedValue(null);
      await expect(
        StorageService.getDownloadPayload({ userId: 'u1', fileId: 'f1' })
      ).rejects.toThrow('File not found');
    });
  });

  describe('updateEntry', () => {
    it('renames an entry', async () => {
      fileInventory.findFirst
        .mockResolvedValueOnce({
          id: 'f1',
          parentId: null,
          isFolder: false,
          name: 'Old',
        })
        .mockResolvedValueOnce(null);
      fileInventory.update.mockResolvedValue({
        id: 'f1',
        name: 'New',
        fileSize: null,
      });

      const result = await StorageService.updateEntry({
        userId: 'u1',
        fileId: 'f1',
        name: ' New ',
      });
      expect(result.name).toBe('New');
    });

    it('throws when duplicate name exists in target folder', async () => {
      fileInventory.findFirst
        .mockResolvedValueOnce({
          id: 'f1',
          parentId: null,
          isFolder: false,
          name: 'A',
        })
        .mockResolvedValueOnce({ id: 'dup' });

      await expect(
        StorageService.updateEntry({ userId: 'u1', fileId: 'f1', name: 'A' })
      ).rejects.toThrow('An item with this name already exists');
    });
  });

  describe('softDeleteEntry', () => {
    it('soft deletes a single file', async () => {
      fileInventory.findFirst.mockResolvedValue({ id: 'f1', isFolder: false });
      fileInventory.updateMany.mockResolvedValue({ count: 1 });

      const result = await StorageService.softDeleteEntry({
        userId: 'u1',
        fileId: 'f1',
      });
      expect(result).toEqual({ deletedCount: 1 });
    });

    it('throws when entry does not exist', async () => {
      fileInventory.findFirst.mockResolvedValue(null);
      await expect(
        StorageService.softDeleteEntry({ userId: 'u1', fileId: 'f1' })
      ).rejects.toThrow('File not found');
    });
  });

  describe('deleteEntries', () => {
    it('returns zero for empty input', async () => {
      await expect(
        StorageService.deleteEntries({ userId: 'u1', fileIds: [] })
      ).resolves.toEqual({
        deletedCount: 0,
      });
    });

    it('soft deletes collected entries and continues on storage delete errors', async () => {
      fileInventory.findMany
        .mockResolvedValueOnce([{ id: 'root' }])
        .mockResolvedValueOnce([{ id: 'child-file' }])
        .mockResolvedValueOnce([]);
      fileInventory.findFirst
        .mockResolvedValueOnce({ id: 'root', isFolder: true, objectKey: null })
        .mockResolvedValueOnce({
          id: 'child-file',
          isFolder: false,
          objectKey: 'obj-child',
        });
      mockDeleteInventoryObject.mockRejectedValueOnce(
        new Error('storage down')
      );
      fileInventory.updateMany.mockResolvedValue({ count: 2 });

      const result = await StorageService.deleteEntries({
        userId: 'u1',
        fileIds: ['root'],
      });

      expect(result).toEqual({ deletedCount: 2 });
      expect(fileInventory.updateMany).toHaveBeenCalled();
    });
  });

  describe('getAnalytics', () => {
    it('returns analytics counters and total bytes', async () => {
      fileInventory.count.mockResolvedValueOnce(3).mockResolvedValueOnce(2);
      fileInventory.aggregate.mockResolvedValue({
        _sum: { fileSize: BigInt(4096) },
      });

      const result = await StorageService.getAnalytics({ userId: 'u1' });
      expect(result).toEqual({
        fileCount: 3,
        folderCount: 2,
        totalSizeBytes: 4096,
      });
    });

    it('returns zero bytes when sum is null', async () => {
      fileInventory.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
      fileInventory.aggregate.mockResolvedValue({ _sum: { fileSize: null } });

      const result = await StorageService.getAnalytics({ userId: 'u1' });
      expect(result.totalSizeBytes).toBe(0);
    });
  });
});
