import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GoogleDriveDestinationService } from '@/services/google-drive/GoogleDriveDestinationService';
import { GoogleDriveExportService } from '@/services/google-drive/GoogleDriveExportService';

vi.mock('@/services/google-drive/GoogleDriveDestinationService', () => ({
  GoogleDriveDestinationService: { getExportContext: vi.fn() },
}));

const destinationService = GoogleDriveDestinationService as unknown as {
  getExportContext: ReturnType<typeof vi.fn>;
};

const filesList = vi.fn();
const filesCreate = vi.fn();
const getRequestHeaders = vi.fn();

function createContext(options?: { myDrive?: boolean }) {
  return {
    accountEmail: 'drive-account@example.com',
    auth: { getRequestHeaders },
    destination: options?.myDrive
      ? {
          driveId: null,
          folderId: null,
          kind: 'my_drive',
          name: 'My Drive',
          webViewLink: 'https://drive.google.com/drive/my-drive',
        }
      : {
          driveId: 'shared-drive-1',
          folderId: 'folder-1',
          kind: 'folder',
          name: 'Eduflow Exports',
          webViewLink: 'https://drive.google.com/drive/folders/folder-1',
        },
    drive: { files: { create: filesCreate, list: filesList } },
    metadata: {},
  };
}

const artifact = {
  bytes: new TextEncoder().encode('word,meaning'),
  fileName: 'wordbank.csv',
  mimeType: 'text/csv',
  sourceKind: 'wordbank_csv',
};
const requestId = '9ed2dd42-989f-42d2-99ec-c01269108257';

describe('GoogleDriveExportService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    filesList.mockResolvedValue({ data: { files: [] } });
    filesCreate.mockResolvedValue({
      data: {
        id: 'drive-file-1',
        mimeType: 'text/csv',
        name: 'wordbank.csv',
        size: '12',
        webViewLink: 'https://drive.google.com/file/d/drive-file-1/view',
      },
    });
    getRequestHeaders.mockResolvedValue(
      new Headers({ Authorization: 'Bearer access-token' })
    );
    destinationService.getExportContext.mockResolvedValue(createContext());
  });

  it('uploads a small artifact with typed Drive parameters and idempotency metadata', async () => {
    const result = await GoogleDriveExportService.uploadArtifact({
      artifact,
      requestId,
      userId: 'user-1',
    });

    expect(result).toMatchObject({ fileId: 'drive-file-1', reused: false });
    expect(filesList).toHaveBeenCalledWith(
      expect.objectContaining({
        corpora: 'drive',
        driveId: 'shared-drive-1',
        includeItemsFromAllDrives: true,
        supportsAllDrives: true,
      })
    );
    expect(filesCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        requestBody: expect.objectContaining({
          appProperties: expect.objectContaining({
            eduflow_export_request_id: requestId,
          }),
          parents: ['folder-1'],
        }),
        supportsAllDrives: true,
      })
    );
  });

  it('omits parents when My Drive root is the explicit destination', async () => {
    destinationService.getExportContext.mockResolvedValue(
      createContext({ myDrive: true })
    );

    await GoogleDriveExportService.uploadArtifact({
      artifact,
      requestId,
      userId: 'user-1',
    });

    expect(filesCreate.mock.calls[0]?.[0].requestBody).not.toHaveProperty(
      'parents'
    );
  });

  it('reuses a file created for the same export request', async () => {
    filesList.mockResolvedValue({
      data: { files: [{ id: 'existing-file', name: 'activity.html' }] },
    });

    const result = await GoogleDriveExportService.uploadArtifact({
      artifact: { ...artifact, fileName: 'activity.html' },
      requestId,
      userId: 'user-1',
    });

    expect(result).toMatchObject({ fileId: 'existing-file', reused: true });
    expect(filesCreate).not.toHaveBeenCalled();
  });

  it('uses the isolated resumable transport above five megabytes', async () => {
    const bytes = new Uint8Array(5 * 1024 * 1024 + 1);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, {
          headers: { Location: 'https://upload.example.test/session-1' },
          status: 200,
        })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ id: 'large-file', name: 'lesson.pptx' }),
          { status: 200 }
        )
      );
    vi.stubGlobal('fetch', fetchMock);

    const result = await GoogleDriveExportService.uploadArtifact({
      artifact: {
        bytes,
        fileName: 'lesson.pptx',
        mimeType:
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        sourceKind: 'lesson_presentation',
      },
      requestId,
      userId: 'user-1',
    });

    expect(result.fileId).toBe('large-file');
    expect(filesCreate).not.toHaveBeenCalled();
    expect(fetchMock.mock.calls[0]?.[0]).toContain('uploadType=resumable');
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      'https://upload.example.test/session-1'
    );
    expect(fetchMock.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: 'Bearer access-token',
        }),
      })
    );
  });

  it('recovers a resumable upload offset after a transient server error', async () => {
    const bytes = new Uint8Array(5 * 1024 * 1024 + 2);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, {
          headers: { Location: 'https://upload.example.test/session-recovery' },
          status: 200,
        })
      )
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(
        new Response(null, {
          headers: { Range: 'bytes=0-1023' },
          status: 308,
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 'recovered-file' }), { status: 200 })
      );
    vi.stubGlobal('fetch', fetchMock);

    const result = await GoogleDriveExportService.uploadArtifact({
      artifact: {
        bytes,
        fileName: 'lesson.pptx',
        mimeType:
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        sourceKind: 'lesson_presentation',
      },
      requestId,
      userId: 'user-1',
    });

    expect(result.fileId).toBe('recovered-file');
    expect(fetchMock.mock.calls[3]?.[1]).toEqual(
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Range': `bytes 1024-${bytes.byteLength - 1}/${bytes.byteLength}`,
        }),
      })
    );
  });

  it('rejects a resumable session without a location header', async () => {
    const bytes = new Uint8Array(5 * 1024 * 1024 + 1);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 200 }))
    );

    await expect(
      GoogleDriveExportService.uploadArtifact({
        artifact: { ...artifact, bytes },
        requestId,
        userId: 'user-1',
      })
    ).rejects.toMatchObject({ code: 'DRIVE_UPLOAD_FAILED' });
  });

  it('fails after Google Drive leaves every resumable attempt incomplete', async () => {
    const bytes = new Uint8Array(5 * 1024 * 1024 + 1);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, {
          headers: { Location: 'https://upload.example.test/incomplete' },
          status: 200,
        })
      )
      .mockResolvedValue(new Response(null, { status: 308 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      GoogleDriveExportService.uploadArtifact({
        artifact: { ...artifact, bytes },
        requestId,
        userId: 'user-1',
      })
    ).rejects.toMatchObject({ code: 'DRIVE_UPLOAD_FAILED' });
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  it('maps typed Drive permission failures to a destination error', async () => {
    filesCreate.mockRejectedValue({
      message: 'The caller does not have permission',
      response: { status: 403 },
    });

    await expect(
      GoogleDriveExportService.uploadArtifact({
        artifact,
        requestId,
        userId: 'user-1',
      })
    ).rejects.toMatchObject({ code: 'DRIVE_DESTINATION_UNAVAILABLE' });
  });
});
