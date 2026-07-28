import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GoogleDriveDestinationService } from '@/services/google-drive/GoogleDriveDestinationService';
import { GoogleDriveExportService } from '@/services/google-drive/GoogleDriveExportService';

vi.mock('@/services/google-drive/GoogleDriveDestinationService', () => ({
  GoogleDriveDestinationService: {
    getExportContext: vi.fn(),
  },
}));

const destinationService = GoogleDriveDestinationService as unknown as {
  getExportContext: ReturnType<typeof vi.fn>;
};

describe('GoogleDriveExportService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    destinationService.getExportContext.mockResolvedValue({
      accessToken: 'access-token',
      destination: {
        driveId: 'shared-drive-1',
        folderId: 'folder-1',
        kind: 'folder',
        name: 'Eduflow Exports',
        webViewLink: 'https://drive.google.com/drive/folders/folder-1',
      },
    });
  });

  it('uploads a small artifact to the configured folder with idempotency metadata', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ files: [] }), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'drive-file-1',
            mimeType: 'text/csv',
            name: 'wordbank.csv',
            size: '12',
            webViewLink: 'https://drive.google.com/file/d/drive-file-1/view',
          }),
          { status: 200 }
        )
      );
    vi.stubGlobal('fetch', fetchMock);

    const result = await GoogleDriveExportService.uploadArtifact({
      artifact: {
        bytes: new TextEncoder().encode('word,meaning'),
        fileName: 'wordbank.csv',
        mimeType: 'text/csv',
        sourceKind: 'wordbank_csv',
      },
      requestId: '9ed2dd42-989f-42d2-99ec-c01269108257',
      userId: 'user-1',
    });

    expect(result.reused).toBe(false);
    expect(result.fileId).toBe('drive-file-1');
    expect(fetchMock.mock.calls[0]?.[0]).toContain(
      'includeItemsFromAllDrives=true'
    );
    expect(fetchMock.mock.calls[0]?.[0]).toContain('driveId=shared-drive-1');
    expect(fetchMock.mock.calls[1]?.[0]).toContain('uploadType=multipart');
    const uploadInit = fetchMock.mock.calls[1]?.[1] as RequestInit;
    const uploadBody = await (uploadInit.body as Blob).text();
    expect(uploadBody).toContain('"parents":["folder-1"]');
    expect(uploadBody).toContain(
      '"eduflow_export_request_id":"9ed2dd42-989f-42d2-99ec-c01269108257"'
    );
  });

  it('omits parents when My Drive root is the explicit destination', async () => {
    destinationService.getExportContext.mockResolvedValue({
      accessToken: 'access-token',
      destination: {
        driveId: null,
        folderId: null,
        kind: 'my_drive',
        name: 'My Drive',
        webViewLink: 'https://drive.google.com/drive/my-drive',
      },
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ files: [] }), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'root-file',
            mimeType: 'text/csv',
            name: 'wordbank.csv',
          }),
          { status: 200 }
        )
      );
    vi.stubGlobal('fetch', fetchMock);

    await GoogleDriveExportService.uploadArtifact({
      artifact: {
        bytes: new TextEncoder().encode('word,meaning'),
        fileName: 'wordbank.csv',
        mimeType: 'text/csv',
        sourceKind: 'wordbank_csv',
      },
      requestId: '9ed2dd42-989f-42d2-99ec-c01269108257',
      userId: 'user-1',
    });

    const uploadInit = fetchMock.mock.calls[1]?.[1] as RequestInit;
    const uploadBody = uploadInit.body as Blob;
    expect(await uploadBody.text()).not.toContain('"parents"');
  });

  it('reuses a file created for the same export request', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          files: [
            {
              id: 'existing-file',
              mimeType: 'text/html',
              name: 'activity.html',
              size: '20',
              webViewLink: 'https://drive.google.com/file/d/existing-file/view',
            },
          ],
        }),
        { status: 200 }
      )
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await GoogleDriveExportService.uploadArtifact({
      artifact: {
        bytes: new TextEncoder().encode('<!doctype html>'),
        fileName: 'activity.html',
        mimeType: 'text/html',
        sourceKind: 'study_interactive_html',
      },
      requestId: 'ec74539b-da9f-47e6-85b7-ea3cd6c4809a',
      userId: 'user-1',
    });

    expect(result.reused).toBe(true);
    expect(result.fileId).toBe('existing-file');
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('uses a resumable upload for artifacts larger than five megabytes', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ files: [] }), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(null, {
          headers: { Location: 'https://upload.example.test/session-1' },
          status: 200,
        })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'large-file',
            mimeType:
              'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            name: 'lesson.pptx',
            size: String(5 * 1024 * 1024 + 1),
            webViewLink: 'https://drive.google.com/file/d/large-file/view',
          }),
          { status: 200 }
        )
      );
    vi.stubGlobal('fetch', fetchMock);

    const result = await GoogleDriveExportService.uploadArtifact({
      artifact: {
        bytes: new Uint8Array(5 * 1024 * 1024 + 1),
        fileName: 'lesson.pptx',
        mimeType:
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        sourceKind: 'lesson_presentation',
      },
      requestId: '234d2d31-b954-42bc-b723-5f0cba08a71d',
      userId: 'user-1',
    });

    expect(result.fileId).toBe('large-file');
    expect(fetchMock.mock.calls[1]?.[0]).toContain('uploadType=resumable');
    expect(fetchMock.mock.calls[2]?.[0]).toBe(
      'https://upload.example.test/session-1'
    );
    expect(fetchMock.mock.calls[2]?.[1]).toEqual(
      expect.objectContaining({ method: 'PUT' })
    );
  });

  it('recovers a resumable upload offset after a transient server error', async () => {
    const bytes = new Uint8Array(5 * 1024 * 1024 + 2);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ files: [] }), { status: 200 })
      )
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
        new Response(
          JSON.stringify({ id: 'recovered-file', name: 'lesson.pptx' }),
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
      requestId: '234d2d31-b954-42bc-b723-5f0cba08a71d',
      userId: 'user-1',
    });

    expect(result.fileId).toBe('recovered-file');
    expect(fetchMock.mock.calls[4]?.[1]).toEqual(
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Range': `bytes 1024-${bytes.byteLength - 1}/${bytes.byteLength}`,
        }),
      })
    );
  });
});
