import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { OneDriveDestinationService } from '@/services/onedrive/OneDriveDestinationService';
import { OneDriveOAuthTokenService } from '@/services/onedrive/OneDriveOAuthTokenService';

vi.mock('@/lib/prisma', () => ({
  prisma: { connectedIntegration: { update: vi.fn() } },
}));

vi.mock('@/services/onedrive/OneDriveOAuthTokenService', () => ({
  OneDriveOAuthTokenService: { getAuthorizedContext: vi.fn() },
}));

const tokenService = OneDriveOAuthTokenService as unknown as {
  getAuthorizedContext: ReturnType<typeof vi.fn>;
};
const connectedIntegration = prisma.connectedIntegration as unknown as {
  update: ReturnType<typeof vi.fn>;
};

const get = vi.fn();
const select = vi.fn().mockReturnThis();

function createGraph() {
  return {
    api: vi.fn(() => ({ get, select })),
  };
}

describe('OneDriveDestinationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tokenService.getAuthorizedContext.mockResolvedValue({
      graph: createGraph(),
      metadata: { accountName: 'One User' },
    });
  });

  it('validates and stores a selected OneDrive folder', async () => {
    get.mockResolvedValue({
      folder: {},
      id: 'folder-1',
      name: 'Exports',
      webUrl: 'https://tenant-my.sharepoint.com/folder-1',
    });

    const result = await OneDriveDestinationService.setDestination('user-1', {
      driveId: 'drive-1',
      folderId: 'folder-1',
      kind: 'folder',
    });

    expect(select).toHaveBeenCalledWith('id,name,folder,webUrl');
    expect(result).toMatchObject({
      driveId: 'drive-1',
      folderId: 'folder-1',
      kind: 'folder',
      name: 'Exports',
    });
    expect(connectedIntegration.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          metadata: expect.objectContaining({
            accountName: 'One User',
            destination: expect.objectContaining({ folderId: 'folder-1' }),
          }),
        },
      })
    );
  });

  it('rejects a selected item that is not a folder', async () => {
    get.mockResolvedValue({
      file: { mimeType: 'text/plain' },
      id: 'file-1',
      name: 'notes.txt',
    });

    await expect(
      OneDriveDestinationService.setDestination('user-1', {
        driveId: 'drive-1',
        folderId: 'file-1',
        kind: 'folder',
      })
    ).rejects.toThrow('OneDrive destination is not a writable folder.');
    expect(connectedIntegration.update).not.toHaveBeenCalled();
  });
});
