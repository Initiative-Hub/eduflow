import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import {
  buildInventoryObjectKey,
  buildInventoryThumbnailObjectKey,
  createInventoryReadSignedUrl,
  createInventoryWriteSignedUrl,
  deleteInventoryObject,
  downloadInventoryObject,
  getInventoryObjectMetadata,
  uploadInventoryObject,
} from '@/lib/storage/file-storage';
import { createPdfFirstPageThumbnail } from '@/lib/storage/pdf-thumbnail';
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
    assignmentSubmissionFile: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock('@/lib/storage/file-storage', () => ({
  STORAGE_MAX_FILE_SIZE_BYTES: 50 * 1024 * 1024,
  FILE_INVENTORY_BUCKET_NAME: 'eduflow-inventory',
  buildInventoryObjectKey: vi.fn(),
  buildInventoryThumbnailObjectKey: vi.fn(),
  getInventoryObjectMetadata: vi.fn(),
  uploadInventoryObject: vi.fn(),
  downloadInventoryObject: vi.fn(),
  deleteInventoryObject: vi.fn(),
  createInventoryReadSignedUrl: vi.fn(),
  createInventoryWriteSignedUrl: vi.fn(),
}));

vi.mock('@/lib/storage/pdf-thumbnail', () => ({
  createPdfFirstPageThumbnail: vi.fn(),
}));

const fileInventory = prisma.fileInventory as unknown as Record<
  string,
  ReturnType<typeof vi.fn>
>;
const assignmentSubmissionFile =
  prisma.assignmentSubmissionFile as unknown as Record<
    string,
    ReturnType<typeof vi.fn>
  >;
const mockBuildInventoryObjectKey = buildInventoryObjectKey as ReturnType<
  typeof vi.fn
>;
const mockBuildInventoryThumbnailObjectKey =
  buildInventoryThumbnailObjectKey as ReturnType<typeof vi.fn>;
const mockGetInventoryObjectMetadata = getInventoryObjectMetadata as ReturnType<
  typeof vi.fn
>;
const mockUploadInventoryObject = uploadInventoryObject as ReturnType<
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
const mockCreatePdfFirstPageThumbnail =
  createPdfFirstPageThumbnail as ReturnType<typeof vi.fn>;

describe('StorageService', () => {
  beforeEach(() => {
    Object.values(fileInventory).forEach((mockFn) => {
      mockFn.mockReset();
    });
    Object.values(assignmentSubmissionFile).forEach((mockFn) => {
      mockFn.mockReset();
      mockFn.mockResolvedValue(null);
    });
    mockBuildInventoryObjectKey.mockReset();
    mockBuildInventoryThumbnailObjectKey.mockReset();
    mockGetInventoryObjectMetadata.mockReset();
    mockUploadInventoryObject.mockReset();
    mockCreateInventoryReadSignedUrl.mockReset();
    mockCreateInventoryWriteSignedUrl.mockReset();
    mockDeleteInventoryObject.mockReset();
    mockDownloadInventoryObject.mockReset();
    mockCreatePdfFirstPageThumbnail.mockReset();
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
      expect(result.items).toEqual([
        { id: 'f1', fileSize: 2, thumbnailUrl: null },
      ]);
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

    it('lists course entries without restricting results to the current user', async () => {
      fileInventory.findMany.mockResolvedValue([
        { id: 'f1', fileSize: BigInt(2), userId: 'u2' },
      ]);
      fileInventory.count.mockResolvedValue(1);

      await StorageService.listDirectory({
        userId: 'u1',
        courseId: 'course-1',
        parentId: null,
        limit: 10,
        offset: 0,
      });

      expect(fileInventory.findMany).toHaveBeenCalledWith({
        where: {
          courseId: 'course-1',
          deletedAt: null,
          parentId: null,
        },
        take: 10,
        skip: 0,
        orderBy: [{ isFolder: 'desc' }, { name: 'asc' }, { createdAt: 'desc' }],
      });
      expect(fileInventory.count).toHaveBeenCalledWith({
        where: {
          courseId: 'course-1',
          deletedAt: null,
          parentId: null,
        },
      });
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
      fileInventory.findFirst.mockResolvedValueOnce({
        id: 'dup',
        isFolder: false,
        name: 'Docs',
      });

      await expect(
        StorageService.createFolder({
          userId: 'u1',
          parentId: null,
          name: 'Docs',
        })
      ).rejects.toMatchObject({
        code: 'STORAGE_NAME_CONFLICT',
        details: {
          attemptedName: 'Docs',
          conflictingName: 'Docs',
          entryType: 'folder',
          operation: 'create_folder',
          targetParentId: null,
        },
      });
    });

    it('allows creating a folder inside a course parent owned by another member', async () => {
      fileInventory.findFirst
        .mockResolvedValueOnce({
          id: 'parent',
          courseId: 'course-1',
          isFolder: true,
          userId: 'u2',
        })
        .mockResolvedValueOnce(null);
      fileInventory.create.mockResolvedValue({
        id: 'n1',
        fileSize: null,
        name: 'Shared Folder',
      });

      await StorageService.createFolder({
        userId: 'u1',
        courseId: 'course-1',
        parentId: 'parent',
        name: 'Shared Folder',
      });

      expect(fileInventory.findFirst).toHaveBeenNthCalledWith(1, {
        where: {
          courseId: 'course-1',
          deletedAt: null,
          id: 'parent',
          isFolder: true,
        },
      });
      expect(fileInventory.findFirst).toHaveBeenNthCalledWith(2, {
        where: {
          courseId: 'course-1',
          deletedAt: null,
          name: {
            equals: 'Shared Folder',
            mode: 'insensitive',
          },
          parentId: 'parent',
        },
        select: {
          id: true,
          isFolder: true,
          name: true,
        },
      });
    });
  });

  describe('initializeUpload', () => {
    it('returns upload session payload', async () => {
      mockBuildInventoryObjectKey.mockReturnValue('inventories/u1/readme.pdf');
      fileInventory.create.mockResolvedValue({ id: 'f1', status: 'UPLOADING' });
      mockCreateInventoryWriteSignedUrl.mockResolvedValue('https://upload');
      fileInventory.findFirst.mockResolvedValue(null);

      const result = await StorageService.initializeUpload({
        userId: 'u1',
        parentId: null,
        fileName: 'readme.pdf',
        contentType: 'application/pdf',
        fileSize: 42,
      });

      expect(result).toEqual({
        id: 'f1',
        name: 'readme.pdf',
        status: 'UPLOADING',
        objectKey: 'inventories/u1/readme.pdf',
        bucket: 'eduflow-inventory',
        uploadUrl: 'https://upload',
        uploadHeaders: { 'Content-Type': 'application/pdf' },
      });
      expect(mockBuildInventoryObjectKey).toHaveBeenCalledWith(
        'u1',
        'readme.pdf',
        { courseId: undefined }
      );
      expect(mockBuildInventoryObjectKey.mock.calls[0]?.[2]).not.toHaveProperty(
        'relativePath'
      );
    });

    it('renames uploads with a windows-style suffix when the target name already exists', async () => {
      mockBuildInventoryObjectKey.mockReturnValue(
        'inventories/u1/readme-(1).pdf'
      );
      fileInventory.findFirst
        .mockResolvedValueOnce({
          id: 'dup',
          isFolder: false,
          name: 'readme.pdf',
        })
        .mockResolvedValueOnce(null);
      fileInventory.create.mockResolvedValue({ id: 'f1', status: 'UPLOADING' });
      mockCreateInventoryWriteSignedUrl.mockResolvedValue('https://upload');

      await StorageService.initializeUpload({
        userId: 'u1',
        parentId: null,
        fileName: 'readme.pdf',
        contentType: 'application/pdf',
        fileSize: 42,
      });

      expect(mockBuildInventoryObjectKey).toHaveBeenCalledWith(
        'u1',
        'readme (1).pdf',
        { courseId: undefined }
      );
      expect(fileInventory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          extension: 'pdf',
          isFolder: false,
          name: 'readme (1).pdf',
        }),
      });
    });

    it('continues numeric suffixes already present in the incoming filename', async () => {
      mockBuildInventoryObjectKey.mockReturnValue(
        'inventories/u1/report-(2).pdf'
      );
      fileInventory.findFirst
        .mockResolvedValueOnce({
          id: 'dup',
          isFolder: false,
          name: 'Report (1).pdf',
        })
        .mockResolvedValueOnce(null);
      fileInventory.create.mockResolvedValue({ id: 'f1', status: 'UPLOADING' });
      mockCreateInventoryWriteSignedUrl.mockResolvedValue('https://upload');

      await StorageService.initializeUpload({
        userId: 'u1',
        parentId: null,
        fileName: 'Report (1).pdf',
        contentType: 'application/pdf',
        fileSize: 42,
      });

      expect(fileInventory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Report (2).pdf',
        }),
      });
    });

    it('retries with the next suffix when a unique race occurs during upload creation', async () => {
      mockBuildInventoryObjectKey
        .mockReturnValueOnce('inventories/u1/readme-(1).pdf')
        .mockReturnValueOnce('inventories/u1/readme-(2).pdf');
      fileInventory.findFirst
        .mockResolvedValueOnce({
          id: 'dup',
          isFolder: false,
          name: 'readme.pdf',
        })
        .mockResolvedValueOnce(null);
      fileInventory.create
        .mockRejectedValueOnce(
          Object.assign(new Error('Unique constraint failed'), {
            code: 'P2002',
          })
        )
        .mockResolvedValueOnce({ id: 'f1', status: 'UPLOADING' });
      mockCreateInventoryWriteSignedUrl.mockResolvedValue('https://upload');

      await StorageService.initializeUpload({
        userId: 'u1',
        parentId: null,
        fileName: 'readme.pdf',
        contentType: 'application/pdf',
        fileSize: 42,
      });

      expect(fileInventory.create).toHaveBeenLastCalledWith({
        data: expect.objectContaining({
          name: 'readme (2).pdf',
        }),
      });
    });

    it('creates missing folder path before creating the pending file', async () => {
      mockBuildInventoryObjectKey.mockReturnValue('inventories/u1/readme.pdf');
      fileInventory.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      fileInventory.create
        .mockResolvedValueOnce({
          id: 'folder-ai',
          fileSize: null,
          name: 'ai-chats',
        })
        .mockResolvedValueOnce({
          id: 'folder-chat',
          fileSize: null,
          name: 'chat-1',
        })
        .mockResolvedValueOnce({ id: 'f1', status: 'UPLOADING' });
      mockCreateInventoryWriteSignedUrl.mockResolvedValue('https://upload');

      await StorageService.initializeUpload({
        userId: 'u1',
        folderPath: ['ai-chats', 'chat-1'],
        fileName: 'readme.pdf',
        contentType: 'application/pdf',
        fileSize: 42,
      });

      expect(fileInventory.create).toHaveBeenNthCalledWith(1, {
        data: {
          courseId: null,
          isFolder: true,
          name: 'ai-chats',
          parentId: null,
          status: 'READY',
          userId: 'u1',
        },
      });
      expect(fileInventory.create).toHaveBeenNthCalledWith(2, {
        data: {
          courseId: null,
          isFolder: true,
          name: 'chat-1',
          parentId: 'folder-ai',
          status: 'READY',
          userId: 'u1',
        },
      });
      expect(fileInventory.create).toHaveBeenNthCalledWith(3, {
        data: expect.objectContaining({
          isFolder: false,
          parentId: 'folder-chat',
        }),
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

    it('generates and persists a PDF thumbnail when confirming upload', async () => {
      fileInventory.findFirst.mockResolvedValue({
        id: 'f1',
        userId: 'u1',
        courseId: null,
        isFolder: false,
        objectKey: 'users/u1/file.pdf',
        fileSize: BigInt(10),
        mimeType: 'application/pdf',
        extension: 'pdf',
      });
      mockGetInventoryObjectMetadata.mockResolvedValue({
        exists: true,
        contentLength: 10,
      });
      mockDownloadInventoryObject.mockResolvedValue({
        bytes: new Uint8Array([1, 2, 3]),
        contentType: 'application/pdf',
      });
      mockCreatePdfFirstPageThumbnail.mockResolvedValue(
        new Uint8Array([0xff, 0xd8, 0xff])
      );
      mockBuildInventoryThumbnailObjectKey.mockReturnValue(
        'users/u1/thumbnails/f1.jpg'
      );
      fileInventory.update.mockResolvedValue({
        id: 'f1',
        fileSize: BigInt(10),
        status: 'READY',
        thumbnailObjectKey: 'users/u1/thumbnails/f1.jpg',
        thumbnailMimeType: 'image/jpeg',
      });

      await StorageService.confirmUpload({
        userId: 'u1',
        fileId: 'f1',
      });

      expect(mockCreatePdfFirstPageThumbnail).toHaveBeenCalledWith(
        new Uint8Array([1, 2, 3])
      );
      expect(mockUploadInventoryObject).toHaveBeenCalledWith({
        objectKey: 'users/u1/thumbnails/f1.jpg',
        contentType: 'image/jpeg',
        body: new Uint8Array([0xff, 0xd8, 0xff]),
      });
      expect(fileInventory.update).toHaveBeenCalledWith({
        where: {
          id: 'f1',
        },
        data: {
          status: 'READY',
          checksumSha256: null,
          uploadedAt: expect.any(Date),
          thumbnailObjectKey: 'users/u1/thumbnails/f1.jpg',
          thumbnailMimeType: 'image/jpeg',
        },
      });
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
          deletedAt: null,
          id: { in: ['f1'] },
          isFolder: false,
          OR: [
            {
              courseId: null,
              userId: 'u1',
            },
          ],
          status: 'READY',
        },
        select: {
          bucket: true,
          courseId: true,
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
          deletedAt: null,
          id: { in: ['f1'] },
          isFolder: false,
          OR: [
            {
              courseId: null,
              userId: 'u1',
            },
          ],
          status: 'READY',
        },
        select: {
          courseId: true,
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
        .mockResolvedValueOnce({ id: 'dup', isFolder: true, name: 'A' });

      await expect(
        StorageService.updateEntry({ userId: 'u1', fileId: 'f1', name: 'A' })
      ).rejects.toMatchObject({
        code: 'STORAGE_NAME_CONFLICT',
        details: {
          attemptedName: 'A',
          conflictingName: 'A',
          entryType: 'file',
          operation: 'rename',
          targetParentId: null,
        },
      });
    });

    it('checks course-scoped duplicates when renaming a course entry', async () => {
      fileInventory.findFirst.mockReset();
      fileInventory.update.mockReset();
      fileInventory.findFirst
        .mockResolvedValueOnce({
          courseId: 'course-1',
          id: 'f1',
          isFolder: false,
          name: 'Old',
          parentId: null,
          userId: 'u2',
        })
        .mockResolvedValueOnce({ id: 'dup', isFolder: false, name: 'Shared' });

      await expect(
        StorageService.updateEntry({
          userId: 'u1',
          courseId: 'course-1',
          fileId: 'f1',
          name: 'Shared',
        })
      ).rejects.toMatchObject({
        code: 'STORAGE_NAME_CONFLICT',
        details: {
          attemptedName: 'Shared',
          conflictingName: 'Shared',
          entryType: 'file',
          operation: 'rename',
          targetParentId: null,
        },
      });

      expect(fileInventory.findFirst).toHaveBeenNthCalledWith(2, {
        where: {
          courseId: 'course-1',
          deletedAt: null,
          id: {
            not: 'f1',
          },
          name: {
            equals: 'Shared',
            mode: 'insensitive',
          },
          parentId: null,
        },
        select: {
          id: true,
          isFolder: true,
          name: true,
        },
      });
    });

    it('returns a move conflict when the destination already has a peer with the same name', async () => {
      fileInventory.findFirst
        .mockResolvedValueOnce({
          id: 'f1',
          parentId: null,
          isFolder: true,
          name: 'Docs',
          courseId: null,
        })
        .mockResolvedValueOnce({
          id: 'parent-2',
          parentId: null,
          isFolder: true,
          name: 'Target',
          courseId: null,
          userId: 'u1',
        })
        .mockResolvedValueOnce({
          parentId: null,
        })
        .mockResolvedValueOnce({
          id: 'dup',
          isFolder: false,
          name: 'Docs',
        });

      await expect(
        StorageService.updateEntry({
          userId: 'u1',
          fileId: 'f1',
          parentId: 'parent-2',
        })
      ).rejects.toMatchObject({
        code: 'STORAGE_NAME_CONFLICT',
        details: {
          attemptedName: 'Docs',
          conflictingName: 'Docs',
          entryType: 'folder',
          operation: 'move',
          targetParentId: 'parent-2',
        },
      });
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

    it('deletes course entries across mixed owners within the same course', async () => {
      fileInventory.findMany.mockReset();
      fileInventory.findFirst.mockReset();
      fileInventory.updateMany.mockReset();
      fileInventory.findMany
        .mockResolvedValueOnce([{ id: 'root' }])
        .mockResolvedValueOnce([{ id: 'child-file' }])
        .mockResolvedValueOnce([]);
      fileInventory.findFirst
        .mockResolvedValueOnce({
          courseId: 'course-1',
          id: 'root',
          isFolder: true,
          objectKey: null,
          userId: 'u2',
        })
        .mockResolvedValueOnce({
          courseId: 'course-1',
          id: 'child-file',
          isFolder: false,
          objectKey: 'obj-child',
          userId: 'u3',
        });
      fileInventory.updateMany.mockResolvedValue({ count: 2 });

      await StorageService.deleteEntries({
        userId: 'u1',
        courseId: 'course-1',
        fileIds: ['root'],
      });

      expect(fileInventory.findMany).toHaveBeenNthCalledWith(1, {
        where: {
          courseId: 'course-1',
          deletedAt: null,
          id: {
            in: ['root'],
          },
        },
        select: {
          id: true,
        },
      });
      expect(fileInventory.updateMany).toHaveBeenCalledWith({
        where: {
          courseId: 'course-1',
          deletedAt: null,
          id: {
            in: ['root', 'child-file'],
          },
        },
        data: {
          deletedAt: expect.any(Date),
          status: 'DELETED',
        },
      });
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

    it('aggregates course analytics across files owned by different members', async () => {
      fileInventory.count.mockResolvedValueOnce(4).mockResolvedValueOnce(1);
      fileInventory.aggregate.mockResolvedValue({
        _sum: { fileSize: BigInt(8192) },
      });

      const result = await StorageService.getAnalytics({
        userId: 'u1',
        courseId: 'course-1',
      });

      expect(fileInventory.count).toHaveBeenNthCalledWith(1, {
        where: {
          courseId: 'course-1',
          deletedAt: null,
          isFolder: false,
          status: 'READY',
        },
      });
      expect(fileInventory.count).toHaveBeenNthCalledWith(2, {
        where: {
          courseId: 'course-1',
          deletedAt: null,
          isFolder: true,
        },
      });
      expect(fileInventory.aggregate).toHaveBeenCalledWith({
        where: {
          courseId: 'course-1',
          deletedAt: null,
          isFolder: false,
          status: 'READY',
        },
        _sum: {
          fileSize: true,
        },
      });
      expect(result).toEqual({
        fileCount: 4,
        folderCount: 1,
        totalSizeBytes: 8192,
      });
    });
  });
});
