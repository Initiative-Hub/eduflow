import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { OneDriveDestinationService } from '@/services/onedrive/OneDriveDestinationService';
import { OneDriveOAuthTokenService } from '@/services/onedrive/OneDriveOAuthTokenService';

vi.mock('@/lib/prisma', () => ({
  prisma: { connectedIntegration: { findUnique: vi.fn(), update: vi.fn() } },
}));

vi.mock('@/services/onedrive/OneDriveOAuthTokenService', () => ({
  OneDriveOAuthTokenService: { getAuthorizedContext: vi.fn() },
}));

const tokenService = OneDriveOAuthTokenService as unknown as {
  getAuthorizedContext: ReturnType<typeof vi.fn>;
};
const connectedIntegration = prisma.connectedIntegration as unknown as {
  findUnique: ReturnType<typeof vi.fn>;
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
    get.mockReset();
    select.mockClear();
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

  it('marks stale OneDrive connections without a token cache as requiring reconnect', async () => {
    connectedIntegration.findUnique.mockResolvedValue({
      expiresAt: new Date('2026-09-04T00:00:00.000Z'),
      metadata: {
        driveType: 'personal',
        destination: {
          driveId: 'drive-1',
          folderId: null,
          kind: 'my_drive',
          name: 'My files',
          webViewLink: 'https://onedrive.live.com/?id=root',
        },
        msalHomeAccountId: 'home-account-1',
        msalLocalAccountId: 'local-account-1',
        msalTenantId: 'tenant-1',
        pickerBaseUrl: 'https://onedrive.live.com/picker',
      },
      providerAccount: 'one@example.com',
      refreshToken: null,
      scope: 'Files.ReadWrite',
      tokenCache: null,
      updatedAt: new Date('2026-09-04T00:01:00.000Z'),
    });

    const status = await OneDriveDestinationService.getStatus('user-1');

    expect(status).toMatchObject({
      connected: true,
      requiresReconnect: true,
      setupComplete: false,
    });
  });

  it('treats OneDrive connections with an MSAL cache as usable', async () => {
    connectedIntegration.findUnique.mockResolvedValue({
      expiresAt: new Date('2026-09-04T00:00:00.000Z'),
      metadata: {
        driveType: 'personal',
        destination: {
          driveId: 'drive-1',
          folderId: null,
          kind: 'my_drive',
          name: 'My files',
          webViewLink: 'https://onedrive.live.com/?id=root',
        },
        msalHomeAccountId: 'home-account-1',
        msalLocalAccountId: 'local-account-1',
        msalTenantId: 'tenant-1',
        pickerBaseUrl: 'https://onedrive.live.com/picker',
      },
      providerAccount: 'one@example.com',
      refreshToken: null,
      scope: 'Files.ReadWrite',
      tokenCache: 'encrypted-msal-cache',
      updatedAt: new Date('2026-09-04T00:01:00.000Z'),
    });

    const status = await OneDriveDestinationService.getStatus('user-1');

    expect(status).toMatchObject({
      connected: true,
      requiresReconnect: false,
      setupComplete: true,
    });
  });

  it('requires reconnect when a cached legacy integration lacks Picker metadata', async () => {
    connectedIntegration.findUnique.mockResolvedValue({
      expiresAt: new Date('2026-09-04T00:00:00.000Z'),
      metadata: {},
      providerAccount: 'one@example.com',
      refreshToken: null,
      scope: 'Files.ReadWrite',
      tokenCache: 'encrypted-msal-cache',
      updatedAt: new Date('2026-09-04T00:01:00.000Z'),
    });

    const status = await OneDriveDestinationService.getStatus('user-1');

    expect(status).toMatchObject({
      connected: true,
      requiresReconnect: true,
      setupComplete: false,
    });
  });

  it('stores a browser-safe personal OneDrive root link for My files', async () => {
    get.mockResolvedValueOnce({
      driveType: 'personal',
      id: 'drive-1',
      webUrl:
        'https://my.microsoftpersonalcontent.com/personal/e3da75832cdb0d17/Documents',
    });
    get.mockResolvedValueOnce({
      id: 'root',
      webUrl:
        'https://my.microsoftpersonalcontent.com/personal/e3da75832cdb0d17/Documents',
    });

    const result = await OneDriveDestinationService.setDestination('user-1', {
      kind: 'my_drive',
    });

    expect(select).toHaveBeenCalledWith('id,webUrl,driveType');
    expect(select).toHaveBeenCalledWith('id,webUrl');
    expect(result).toMatchObject({
      driveId: 'drive-1',
      folderId: null,
      kind: 'my_drive',
      name: 'My files',
      webViewLink: 'https://onedrive.live.com/?id=root&cid=e3da75832cdb0d17',
    });
    expect(connectedIntegration.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          metadata: expect.objectContaining({
            accountName: 'One User',
            destination: expect.objectContaining({
              webViewLink:
                'https://onedrive.live.com/?id=root&cid=e3da75832cdb0d17',
            }),
          }),
        },
      })
    );
  });

  it('uses the Graph root web URL for work or school My files destinations', async () => {
    get.mockResolvedValueOnce({
      driveType: 'business',
      id: 'drive-1',
      webUrl: 'https://tenant-my.sharepoint.com/personal/user/Documents',
    });
    get.mockResolvedValueOnce({
      id: 'root',
      webUrl: 'https://tenant-my.sharepoint.com/personal/user/Documents',
    });

    const result = await OneDriveDestinationService.setDestination('user-1', {
      kind: 'my_drive',
    });

    expect(result).toMatchObject({
      driveId: 'drive-1',
      folderId: null,
      kind: 'my_drive',
      webViewLink: 'https://tenant-my.sharepoint.com/personal/user/Documents',
    });
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
