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

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
    status,
  });
}

describe('OneDriveImportService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tokenService.getAuthorizedContext.mockResolvedValue({
      accessToken: 'one-access-token',
    });
    vi.stubGlobal('fetch', vi.fn());
  });

  it('downloads a selected OneDrive file into storage', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        jsonResponse({
          file: { mimeType: 'application/pdf' },
          id: 'item-1',
          name: 'lesson.pdf',
          size: 12,
          webUrl: 'https://onedrive.test/item-1',
        })
      )
      .mockResolvedValueOnce(
        new Response(new Uint8Array([1, 2, 3]), {
          headers: { 'Content-Type': 'application/pdf' },
        })
      );
    storageService.createFileFromBytes.mockResolvedValue({ id: 'file-1' });

    const result = await OneDriveImportService.importFile({
      driveId: 'drive-1',
      itemId: 'item-1',
      parentId: null,
      userId: 'user-1',
    });

    expect(result).toEqual({ id: 'file-1' });
    expect(storageService.createFileFromBytes).toHaveBeenCalledWith(
      expect.objectContaining({
        contentType: 'application/pdf',
        fileName: 'lesson.pdf',
        userId: 'user-1',
      })
    );
  });

  it('rejects folders', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({
        folder: {},
        id: 'folder-1',
        name: 'Folder',
      })
    );

    await expect(
      OneDriveImportService.importFile({
        driveId: 'drive-1',
        itemId: 'folder-1',
        userId: 'user-1',
      })
    ).rejects.toThrow('This OneDrive item cannot be downloaded.');
  });
});
