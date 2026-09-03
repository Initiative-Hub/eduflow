import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StorageService } from '@/services/StorageService';
import { OneDriveImportService } from '@/services/onedrive/OneDriveImportService';
import { OneDriveOAuthTokenService } from '@/services/onedrive/OneDriveOAuthTokenService';

vi.mock('@/services/onedrive/OneDriveOAuthTokenService', () => ({
  OneDriveOAuthTokenService: { getAuthorizedContext: vi.fn() },
}));

vi.mock('@/services/StorageService', () => ({
  StorageService: { createFileFromBytes: vi.fn() },
}));

const tokenService = OneDriveOAuthTokenService as unknown as {
  getAuthorizedContext: ReturnType<typeof vi.fn>;
};
const storageService = StorageService as unknown as {
  createFileFromBytes: ReturnType<typeof vi.fn>;
};

const itemGet = vi.fn();
const contentGet = vi.fn();
const select = vi.fn().mockReturnThis();
const responseType = vi.fn().mockReturnThis();

function createGraph() {
  return {
    api: vi.fn((path: string) =>
      path.endsWith('/content')
        ? { get: contentGet, responseType }
        : { get: itemGet, select }
    ),
  };
}

describe('OneDriveImportService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tokenService.getAuthorizedContext.mockResolvedValue({
      graph: createGraph(),
    });
    itemGet.mockResolvedValue({
      file: { mimeType: 'application/pdf' },
      id: 'item-1',
      name: 'lesson.pdf',
      size: 12,
      webUrl: 'https://onedrive.test/item-1',
    });
    contentGet.mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), {
        headers: { 'Content-Type': 'application/pdf' },
      })
    );
  });

  it('downloads a selected OneDrive file into storage through Graph SDK context', async () => {
    storageService.createFileFromBytes.mockResolvedValue({ id: 'file-1' });

    const result = await OneDriveImportService.importFile({
      driveId: 'drive-1',
      itemId: 'item-1',
      parentId: null,
      userId: 'user-1',
    });

    expect(result).toEqual({ id: 'file-1' });
    expect(select).toHaveBeenCalledWith('id,name,size,file,folder,webUrl');
    expect(responseType).toHaveBeenCalled();
    expect(storageService.createFileFromBytes).toHaveBeenCalledWith(
      expect.objectContaining({
        contentType: 'application/pdf',
        fileName: 'lesson.pdf',
        userId: 'user-1',
      })
    );
  });

  it('rejects folders', async () => {
    itemGet.mockResolvedValue({
      folder: {},
      id: 'folder-1',
      name: 'Folder',
    });

    await expect(
      OneDriveImportService.importFile({
        driveId: 'drive-1',
        itemId: 'folder-1',
        userId: 'user-1',
      })
    ).rejects.toThrow('This OneDrive item cannot be downloaded.');
  });
});
