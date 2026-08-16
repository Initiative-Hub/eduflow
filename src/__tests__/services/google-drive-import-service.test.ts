import { Readable } from 'node:stream';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GoogleDriveImportService } from '@/services/google-drive/GoogleDriveImportService';
import { GoogleDriveOAuthTokenService } from '@/services/google-drive/GoogleDriveOAuthTokenService';
import { StorageService } from '@/services/StorageService';

vi.mock('@/services/StorageService', () => ({
  StorageService: { createFileFromBytes: vi.fn() },
}));
vi.mock('@/services/google-drive/GoogleDriveOAuthTokenService', () => ({
  GoogleDriveOAuthTokenService: { getAuthorizedContext: vi.fn() },
}));

const tokenService = GoogleDriveOAuthTokenService as unknown as {
  getAuthorizedContext: ReturnType<typeof vi.fn>;
};
const storageService = StorageService as unknown as {
  createFileFromBytes: ReturnType<typeof vi.fn>;
};
const filesGet = vi.fn();
const filesExport = vi.fn();

describe('GoogleDriveImportService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tokenService.getAuthorizedContext.mockResolvedValue({
      drive: { files: { export: filesExport, get: filesGet } },
    });
    storageService.createFileFromBytes.mockResolvedValue({ id: 'stored-file' });
  });

  it('downloads a selected binary file through the typed media overload', async () => {
    filesGet
      .mockResolvedValueOnce({
        data: {
          capabilities: { canDownload: true },
          id: 'drive-file-1',
          mimeType: 'application/pdf',
          name: 'lesson.pdf',
          size: '3',
        },
      })
      .mockResolvedValueOnce({
        data: Readable.from(Buffer.from('pdf')),
        headers: { 'content-type': 'application/pdf' },
      });

    await GoogleDriveImportService.importFile({
      fileId: 'drive-file-1',
      userId: 'user-1',
    });

    expect(filesGet).toHaveBeenLastCalledWith(
      {
        alt: 'media',
        fileId: 'drive-file-1',
        supportsAllDrives: true,
      },
      { responseType: 'stream' }
    );
    expect(storageService.createFileFromBytes).toHaveBeenCalledWith(
      expect.objectContaining({
        contentType: 'application/pdf',
        fileName: 'lesson.pdf',
      })
    );
  });

  it('exports a Google Workspace presentation as PPTX', async () => {
    filesGet.mockResolvedValue({
      data: {
        id: 'slides-1',
        mimeType: 'application/vnd.google-apps.presentation',
        name: 'Lesson slides',
      },
    });
    filesExport.mockResolvedValue({
      data: Readable.from(Buffer.from('pptx')),
      headers: {},
    });

    await GoogleDriveImportService.importFile({
      fileId: 'slides-1',
      userId: 'user-1',
    });

    expect(filesExport).toHaveBeenCalledWith(
      {
        fileId: 'slides-1',
        mimeType:
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      },
      { responseType: 'stream' }
    );
    expect(storageService.createFileFromBytes).toHaveBeenCalledWith(
      expect.objectContaining({ fileName: 'Lesson slides.pptx' })
    );
  });

  it('rejects unsupported Google Workspace file types before downloading', async () => {
    filesGet.mockResolvedValue({
      data: {
        id: 'form-1',
        mimeType: 'application/vnd.google-apps.form',
        name: 'Survey',
      },
    });

    await expect(
      GoogleDriveImportService.importFile({
        fileId: 'form-1',
        userId: 'user-1',
      })
    ).rejects.toThrow('This Google Drive file type cannot be imported yet.');
    expect(filesExport).not.toHaveBeenCalled();
  });
});
