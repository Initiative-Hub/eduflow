import { describe, expect, it } from 'vitest';
import { parseOneDriveDestination } from '@/services/onedrive/onedrive-types';

describe('OneDrive destination metadata parsing', () => {
  it('normalizes stored personal My files links away from internal content hosts', () => {
    const destination = parseOneDriveDestination({
      destination: {
        driveId: 'drive-1',
        folderId: null,
        kind: 'my_drive',
        name: 'My files',
        webViewLink:
          'https://my.microsoftpersonalcontent.com/personal/e3da75832cdb0d17/Documents',
      },
    });

    expect(destination).toMatchObject({
      driveId: 'drive-1',
      folderId: null,
      kind: 'my_drive',
      name: 'My files',
      webViewLink: 'https://onedrive.live.com/?id=root&cid=e3da75832cdb0d17',
    });
  });

  it('preserves selected folder links', () => {
    const destination = parseOneDriveDestination({
      destination: {
        driveId: 'drive-1',
        folderId: 'folder-1',
        kind: 'folder',
        name: 'Exports',
        webViewLink: 'https://tenant-my.sharepoint.com/folder-1',
      },
    });

    expect(destination).toMatchObject({
      folderId: 'folder-1',
      kind: 'folder',
      webViewLink: 'https://tenant-my.sharepoint.com/folder-1',
    });
  });
});
