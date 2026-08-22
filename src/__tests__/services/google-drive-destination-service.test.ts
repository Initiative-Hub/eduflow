import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { GoogleDriveDestinationService } from '@/services/google-drive/GoogleDriveDestinationService';
import { GoogleDriveOAuthTokenService } from '@/services/google-drive/GoogleDriveOAuthTokenService';

vi.mock('@/lib/prisma', () => ({
  prisma: { connectedIntegration: { update: vi.fn() } },
}));
vi.mock('@/services/google-drive/GoogleDriveOAuthTokenService', () => ({
  GoogleDriveOAuthTokenService: { getAuthorizedContext: vi.fn() },
}));

const tokenService = GoogleDriveOAuthTokenService as unknown as {
  getAuthorizedContext: ReturnType<typeof vi.fn>;
};
const connectedIntegration = prisma.connectedIntegration as unknown as {
  update: ReturnType<typeof vi.fn>;
};
const filesGet = vi.fn();

describe('GoogleDriveDestinationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tokenService.getAuthorizedContext.mockResolvedValue({
      drive: { files: { get: filesGet } },
      metadata: { accountName: 'Drive User' },
    });
  });

  it('validates and stores a writable shared-drive folder', async () => {
    filesGet.mockResolvedValue({
      data: {
        capabilities: { canAddChildren: true },
        driveId: 'shared-drive-1',
        id: 'folder-1',
        mimeType: 'application/vnd.google-apps.folder',
        name: 'Exports',
        trashed: false,
        webViewLink: 'https://drive.google.com/drive/folders/folder-1',
      },
    });

    const result = await GoogleDriveDestinationService.setDestination(
      'user-1',
      { folderId: 'folder-1', kind: 'folder' }
    );

    expect(filesGet).toHaveBeenCalledWith(
      expect.objectContaining({
        fileId: 'folder-1',
        supportsAllDrives: true,
      })
    );
    expect(result).toMatchObject({
      driveId: 'shared-drive-1',
      folderId: 'folder-1',
      kind: 'folder',
      name: 'Exports',
    });
    expect(connectedIntegration.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          metadata: expect.objectContaining({ accountName: 'Drive User' }),
        },
      })
    );
  });

  it('rejects a folder that cannot accept children', async () => {
    filesGet.mockResolvedValue({
      data: {
        capabilities: { canAddChildren: false },
        id: 'folder-1',
        mimeType: 'application/vnd.google-apps.folder',
        name: 'Read only',
      },
    });

    await expect(
      GoogleDriveDestinationService.setDestination('user-1', {
        folderId: 'folder-1',
        kind: 'folder',
      })
    ).rejects.toThrow('Google Drive destination is not a writable folder.');
    expect(connectedIntegration.update).not.toHaveBeenCalled();
  });
});
