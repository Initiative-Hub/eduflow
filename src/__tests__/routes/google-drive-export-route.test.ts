import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/v1/integrations/google-drive/exports/route';
import { CloudDriveExportArtifactError } from '@/services/cloud-drive/CloudDriveExportArtifactError';
import { GoogleDriveDestinationService } from '@/services/google-drive/GoogleDriveDestinationService';
import { GoogleDriveExportArtifactService } from '@/services/google-drive/GoogleDriveExportArtifactService';
import { GoogleDriveExportService } from '@/services/google-drive/GoogleDriveExportService';

vi.mock('@/lib/api/middlewares', () => ({
  withAuth:
    (handler: (req: Request, session: { user: { id: string } }) => Response) =>
    (req: Request) =>
      handler(req, { user: { id: 'user-1' } }),
}));

vi.mock('@/services/google-drive/GoogleDriveExportArtifactService', () => ({
  GoogleDriveExportArtifactService: { resolve: vi.fn() },
}));

vi.mock('@/services/google-drive/GoogleDriveExportService', () => ({
  GoogleDriveExportService: { uploadArtifact: vi.fn() },
}));

vi.mock('@/services/google-drive/GoogleDriveDestinationService', () => ({
  GoogleDriveDestinationService: { getExportContext: vi.fn() },
}));

const artifactService = GoogleDriveExportArtifactService as unknown as {
  resolve: ReturnType<typeof vi.fn>;
};
const exportService = GoogleDriveExportService as unknown as {
  uploadArtifact: ReturnType<typeof vi.fn>;
};
const destinationService = GoogleDriveDestinationService as unknown as {
  getExportContext: ReturnType<typeof vi.fn>;
};

describe('Google Drive export route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves the source and Drive context before uploading', async () => {
    const artifact = {
      bytes: new TextEncoder().encode('word,meaning'),
      fileName: 'wordbank.csv',
      mimeType: 'text/csv',
      sourceKind: 'wordbank_csv',
    };
    const context = {
      accessToken: 'token',
      destination: { folderId: null, kind: 'my_drive', name: 'My Drive' },
    };
    artifactService.resolve.mockResolvedValue(artifact);
    destinationService.getExportContext.mockResolvedValue(context);
    exportService.uploadArtifact.mockResolvedValue({
      destination: context.destination,
      fileId: 'drive-file-1',
      mimeType: 'text/csv',
      name: 'wordbank.csv',
      reused: false,
      size: 12,
      webViewLink: 'https://drive.google.com/file/d/drive-file-1/view',
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
      new Request(
        'https://eduflow.test/api/v1/integrations/google-drive/exports',
        {
          body: JSON.stringify({ requestId, source }),
          method: 'POST',
        }
      )
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

  it('returns a validation error for an unknown source kind', async () => {
    const response = await POST(
      new Request(
        'https://eduflow.test/api/v1/integrations/google-drive/exports',
        {
          body: JSON.stringify({
            requestId: '9ed2dd42-989f-42d2-99ec-c01269108257',
            source: { kind: 'unknown' },
          }),
          method: 'POST',
        }
      )
    );

    expect(response.status).toBe(400);
    expect(artifactService.resolve).not.toHaveBeenCalled();
  });
  it('preserves provider-neutral source errors in Google Drive responses', async () => {
    artifactService.resolve.mockRejectedValue(
      new CloudDriveExportArtifactError('Source unavailable.', {
        reason: 'LEGACY_GAMMA',
      })
    );
    const response = await POST(
      new Request(
        'https://eduflow.test/api/v1/integrations/google-drive/exports',
        {
          body: JSON.stringify({
            requestId: '9ed2dd42-989f-42d2-99ec-c01269108257',
            source: {
              kind: 'lesson_presentation',
              lessonId: '2b25a6da-09bc-4783-8a0d-60811389d612',
            },
          }),
          method: 'POST',
        }
      )
    );
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({
      code: 'SOURCE_NOT_FOUND',
      details: { reason: 'LEGACY_GAMMA' },
    });
    expect(exportService.uploadArtifact).not.toHaveBeenCalled();
  });
});
