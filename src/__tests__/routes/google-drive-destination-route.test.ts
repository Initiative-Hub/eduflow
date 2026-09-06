import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PUT } from '@/app/api/v1/integrations/google-drive/destination/route';
import { GoogleDriveDestinationService } from '@/services/google-drive/GoogleDriveDestinationService';

vi.mock('@/lib/api/middlewares', () => ({
  withAuth:
    (handler: (req: Request, session: { user: { id: string } }) => Response) =>
    (req: Request) =>
      handler(req, { user: { id: 'user-1' } }),
}));

vi.mock('@/services/google-drive/GoogleDriveDestinationService', () => ({
  GoogleDriveDestinationService: {
    setDestination: vi.fn(),
  },
}));

const destinationService = GoogleDriveDestinationService as unknown as {
  setDestination: ReturnType<typeof vi.fn>;
};

describe('Google Drive destination route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('validates and stores a selected folder for the authenticated user', async () => {
    destinationService.setDestination.mockResolvedValue({
      driveId: 'shared-drive-1',
      folderId: 'folder-1',
      kind: 'folder',
      name: 'Exports',
      webViewLink: 'https://drive.google.com/drive/folders/folder-1',
    });

    const response = await PUT(
      new Request(
        'https://eduflow.test/api/v1/integrations/google-drive/destination',
        {
          body: JSON.stringify({ kind: 'folder', folderId: 'folder-1' }),
          method: 'PUT',
        }
      )
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: expect.objectContaining({ folderId: 'folder-1', kind: 'folder' }),
    });
    expect(destinationService.setDestination).toHaveBeenCalledWith('user-1', {
      folderId: 'folder-1',
      kind: 'folder',
    });
  });

  it('rejects client-supplied folder metadata', async () => {
    const response = await PUT(
      new Request(
        'https://eduflow.test/api/v1/integrations/google-drive/destination',
        {
          body: JSON.stringify({
            folderId: 'folder-1',
            kind: 'folder',
            name: 'Untrusted name',
          }),
          method: 'PUT',
        }
      )
    );

    expect(response.status).toBe(400);
    expect(destinationService.setDestination).not.toHaveBeenCalled();
  });
});
