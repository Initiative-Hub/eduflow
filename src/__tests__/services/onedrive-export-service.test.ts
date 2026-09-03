import type { Client } from '@microsoft/microsoft-graph-client';
import { GraphError } from '@microsoft/microsoft-graph-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OneDriveDestinationService } from '@/services/onedrive/OneDriveDestinationService';
import { OneDriveExportError } from '@/services/onedrive/OneDriveExportError';
import {
  type OneDriveExportContext,
  OneDriveExportService,
} from '@/services/onedrive/OneDriveExportService';

vi.mock('@/services/onedrive/OneDriveDestinationService', () => ({
  OneDriveDestinationService: { getExportContext: vi.fn() },
}));

const destinationService = OneDriveDestinationService as unknown as {
  getExportContext: ReturnType<typeof vi.fn>;
};

const header = vi.fn();
const put = vi.fn();
const post = vi.fn();

function createRequest() {
  const request = { header, post, put };
  header.mockReturnValue(request);
  return request;
}

function createContext(): OneDriveExportContext {
  return {
    accountEmail: 'one@example.com',
    accessToken: 'access-token',
    destination: {
      driveId: 'drive-1',
      folderId: 'folder-1',
      kind: 'folder' as const,
      name: 'EduFlow Exports',
      webViewLink: 'https://tenant-my.sharepoint.com/folder-1',
    },
    graph: { api: vi.fn(() => createRequest()) } as unknown as Client,
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

describe('OneDriveExportService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    destinationService.getExportContext.mockResolvedValue(createContext());
    put.mockResolvedValue({
      file: { mimeType: 'text/csv' },
      id: 'one-file-1',
      name: 'wordbank.csv',
      size: 12,
      webUrl: 'https://tenant-my.sharepoint.com/one-file-1',
    });
  });

  it('uploads a small artifact through the Graph SDK client', async () => {
    const context = createContext();

    const result = await OneDriveExportService.uploadArtifact({
      artifact,
      context,
      requestId,
      userId: 'user-1',
    });

    expect(result).toMatchObject({ fileId: 'one-file-1', reused: false });
    expect(context.graph.api).toHaveBeenCalledWith(
      '/drives/drive-1/items/folder-1:/wordbank.csv:/content'
    );
    expect(header).toHaveBeenCalledWith('Content-Type', 'text/csv');
    expect(put).toHaveBeenCalled();
  });

  it('creates an upload session with the SDK and uploads large chunks to the session URL', async () => {
    const bytes = new Uint8Array(4 * 1024 * 1024 + 1);
    const context = createContext();
    post.mockResolvedValue({
      uploadUrl: 'https://upload.example.test/session',
    });
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'large-file',
          name: 'lesson.pptx',
          size: bytes.byteLength,
        }),
        { status: 200 }
      )
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await OneDriveExportService.uploadArtifact({
      artifact: {
        bytes,
        fileName: 'lesson.pptx',
        mimeType:
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        sourceKind: 'lesson_presentation',
      },
      context,
      requestId,
      userId: 'user-1',
    });

    expect(result.fileId).toBe('large-file');
    expect(context.graph.api).toHaveBeenCalledWith(
      '/drives/drive-1/items/folder-1:/lesson.pptx:/createUploadSession'
    );
    expect(post).toHaveBeenCalledWith({
      item: { '@microsoft.graph.conflictBehavior': 'rename' },
    });
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://upload.example.test/session'
    );
  });

  it('maps Graph destination errors to destination-unavailable export errors', async () => {
    const context = createContext();
    put.mockRejectedValue(new GraphError(404, 'itemNotFound'));

    await expect(
      OneDriveExportService.uploadArtifact({
        artifact,
        context,
        requestId,
        userId: 'user-1',
      })
    ).rejects.toMatchObject({
      code: 'DRIVE_DESTINATION_UNAVAILABLE',
    } satisfies Partial<OneDriveExportError>);
  });
});
