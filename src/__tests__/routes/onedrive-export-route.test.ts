import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/v1/integrations/onedrive/exports/route';
import { CloudDriveExportArtifactService } from '@/services/cloud-drive/CloudDriveExportArtifactService';
import { OneDriveDestinationService } from '@/services/onedrive/OneDriveDestinationService';
import { OneDriveExportService } from '@/services/onedrive/OneDriveExportService';

vi.mock('@/lib/api/middlewares', () => ({
  withAuth:
    (handler: (req: Request, session: { user: { id: string } }) => Response) =>
    (req: Request) =>
      handler(req, { user: { id: 'user-1' } }),
}));

vi.mock('@/services/cloud-drive/CloudDriveExportArtifactService', () => ({
  CloudDriveExportArtifactService: { resolve: vi.fn() },
}));

vi.mock('@/services/onedrive/OneDriveExportService', () => ({
  OneDriveExportService: { uploadArtifact: vi.fn() },
}));

vi.mock('@/services/onedrive/OneDriveDestinationService', () => ({
  OneDriveDestinationService: { getExportContext: vi.fn() },
}));

const artifactService = CloudDriveExportArtifactService as unknown as {
  resolve: ReturnType<typeof vi.fn>;
};
const exportService = OneDriveExportService as unknown as {
  uploadArtifact: ReturnType<typeof vi.fn>;
};
const destinationService = OneDriveDestinationService as unknown as {
  getExportContext: ReturnType<typeof vi.fn>;
};

describe('OneDrive export route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves the source and OneDrive context before uploading', async () => {
    const artifact = {
      bytes: new TextEncoder().encode('word,meaning'),
      fileName: 'wordbank.csv',
      mimeType: 'text/csv',
      sourceKind: 'wordbank_csv',
    };
    const context = {
      accessToken: 'token',
      destination: {
        driveId: 'drive-1',
        folderId: null,
        kind: 'my_drive',
        name: 'My files',
      },
    };
    artifactService.resolve.mockResolvedValue(artifact);
    destinationService.getExportContext.mockResolvedValue(context);
    exportService.uploadArtifact.mockResolvedValue({
      destination: context.destination,
      fileId: 'one-file-1',
      mimeType: 'text/csv',
      name: 'wordbank.csv',
      reused: false,
      size: 12,
      webViewLink: 'https://onedrive.test/one-file-1',
    });

    const source = {
      kind: 'wordbank_csv',
      vocabularyIds: ['2b25a6da-09bc-4783-8a0d-60811389d612'],
      fileName: 'wordbank.csv',
      labels: {
        title: 'Wordbank',
        word: 'Word',
        pronunciation: 'Pronunciation',
        englishDefinition: 'English definition',
        vietnameseTranslation: 'Vietnamese translation',
        exampleSentence: 'Example sentence',
        mastery: 'Mastery',
        wordLists: 'Word lists',
      },
    };
    const requestId = '9ed2dd42-989f-42d2-99ec-c01269108257';
    const response = await POST(
      new Request('https://eduflow.test/api/v1/integrations/onedrive/exports', {
        body: JSON.stringify({ requestId, source }),
        method: 'POST',
      })
    );

    expect(response.status).toBe(200);
    expect(artifactService.resolve).toHaveBeenCalledWith({
      source,
      userId: 'user-1',
    });
    expect(destinationService.getExportContext).toHaveBeenCalledWith('user-1');
    expect(exportService.uploadArtifact).toHaveBeenCalledWith({
      artifact,
      context,
      requestId,
      userId: 'user-1',
    });
  });
});
