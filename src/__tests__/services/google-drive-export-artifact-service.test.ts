import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getCoursePermissions } from '@/lib/permissions/course-permission';
import { prisma } from '@/lib/prisma';
import { GammaService } from '@/services/GammaService';
import { GoogleDriveExportArtifactService } from '@/services/google-drive/GoogleDriveExportArtifactService';
import { LessonPresentationService } from '@/services/LessonPresentationService';
import { LessonService } from '@/services/LessonService';
import { StorageService } from '@/services/StorageService';
import { StudyShareService } from '@/services/StudyShareService';

vi.mock('@/lib/prisma', () => ({
  prisma: { savedVocabulary: { findMany: vi.fn() } },
}));
vi.mock('@/lib/permissions/course-permission', () => ({
  getCoursePermissions: vi.fn(),
}));
vi.mock('@/services/GammaService', () => ({
  GammaService: { getPresentationExport: vi.fn() },
}));
vi.mock('@/services/LessonPresentationService', () => ({
  LessonPresentationService: { getDeckPptx: vi.fn() },
}));
vi.mock('@/services/LessonService', () => ({
  LessonService: { getLessonById: vi.fn() },
}));
vi.mock('@/services/StorageService', () => ({
  StorageService: { getChatAttachmentPayloads: vi.fn() },
}));
vi.mock('@/services/StudyShareService', () => ({
  StudyShareService: { getOwnedInteractiveContent: vi.fn() },
}));

const prismaMock = prisma as unknown as {
  savedVocabulary: { findMany: ReturnType<typeof vi.fn> };
};
const lessonService = LessonService as unknown as {
  getLessonById: ReturnType<typeof vi.fn>;
};
const gammaService = GammaService as unknown as {
  getPresentationExport: ReturnType<typeof vi.fn>;
};
const presentationService = LessonPresentationService as unknown as {
  getDeckPptx: ReturnType<typeof vi.fn>;
};
const studyService = StudyShareService as unknown as {
  getOwnedInteractiveContent: ReturnType<typeof vi.fn>;
};
const storageService = StorageService as unknown as {
  getChatAttachmentPayloads: ReturnType<typeof vi.fn>;
};
const permissionService = getCoursePermissions as ReturnType<typeof vi.fn>;

const wordbankLabels = {
  englishDefinition: 'English definition',
  exampleSentence: 'Example sentence',
  mastery: 'Mastery',
  pronunciation: 'Pronunciation',
  title: 'Wordbank',
  vietnameseTranslation: 'Vietnamese translation',
  word: 'Word',
  wordLists: 'Word lists',
};

function vocabularyRow(id: string, word: string) {
  return {
    audioUrl: null,
    englishDefinition: `${word} definition`,
    exampleSentence: `A ${word} example`,
    id,
    ipa: null,
    listItems: [],
    masteryLevel: 0,
    partOfSpeech: 'noun',
    savedAt: new Date('2026-01-01T00:00:00.000Z'),
    sourceSnippet: null,
    vietnameseTranslation: `${word} translation`,
    word,
  };
}

describe('GoogleDriveExportArtifactService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('preserves requested wordbank order and the UTF-8 BOM', async () => {
    const firstId = '2b25a6da-09bc-4783-8a0d-60811389d612';
    const secondId = '1124d225-3284-4748-82d0-6f3a31ced5db';
    prismaMock.savedVocabulary.findMany.mockResolvedValue([
      vocabularyRow(secondId, 'second'),
      vocabularyRow(firstId, 'first'),
    ]);

    const artifact = await GoogleDriveExportArtifactService.resolve({
      source: {
        fileName: 'wordbank.csv',
        kind: 'wordbank_csv',
        labels: wordbankLabels,
        vocabularyIds: [firstId, secondId],
      },
      userId: 'user-1',
    });
    const csv = new TextDecoder().decode(artifact.bytes);

    expect([...artifact.bytes.slice(0, 3)]).toEqual([239, 187, 191]);
    expect(csv.indexOf('first')).toBeLessThan(csv.indexOf('second'));
    expect(prismaMock.savedVocabulary.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: [firstId, secondId] }, userId: 'user-1' },
      })
    );
  });

  it('rejects partial wordbank results instead of leaking or omitting rows', async () => {
    prismaMock.savedVocabulary.findMany.mockResolvedValue([]);

    await expect(
      GoogleDriveExportArtifactService.resolve({
        source: {
          fileName: 'wordbank.csv',
          kind: 'wordbank_csv',
          labels: wordbankLabels,
          vocabularyIds: ['2b25a6da-09bc-4783-8a0d-60811389d612'],
        },
        userId: 'user-1',
      })
    ).rejects.toMatchObject({ code: 'SOURCE_NOT_FOUND', status: 404 });
  });

  it('uses the same secured document transform for study HTML', async () => {
    studyService.getOwnedInteractiveContent.mockResolvedValue({
      content: {
        description: 'Practice',
        html: '<html><head></head><body><iframe src="https://bad.test"></iframe>Quiz</body></html>',
        title: 'Quiz',
      },
      sourceMessageId: 'message-1',
    });

    const artifact = await GoogleDriveExportArtifactService.resolve({
      source: {
        chatId: 'chat-1',
        contentIndex: 0,
        fileName: 'quiz.html',
        kind: 'study_interactive_html',
        messageId: 'message-1',
      },
      userId: 'user-1',
    });
    const html = new TextDecoder().decode(artifact.bytes);

    expect(html).toContain('Content-Security-Policy');
    expect(html).not.toContain('<iframe');
  });

  it('generates native presentation bytes server-side from the owned lesson', async () => {
    lessonService.getLessonById.mockResolvedValue({
      presentationDeckId: 'native-deck-1',
      presentationDeckKey: null,
      title: 'Cell Biology',
    });
    presentationService.getDeckPptx.mockResolvedValue(
      new Uint8Array([1, 2, 3]).buffer
    );

    const artifact = await GoogleDriveExportArtifactService.resolve({
      source: {
        kind: 'lesson_presentation',
        lessonId: '2b25a6da-09bc-4783-8a0d-60811389d612',
      },
      userId: 'user-1',
    });

    expect(artifact.fileName).toBe('cell-biology.pptx');
    expect([...artifact.bytes]).toEqual([1, 2, 3]);
    expect(presentationService.getDeckPptx).toHaveBeenCalledWith(
      'native-deck-1'
    );
  });

  it('re-queries Gamma with the stored generation ID before downloading', async () => {
    lessonService.getLessonById.mockResolvedValue({
      presentationDeckId: 'gamma:https://gamma.app/docs/example',
      presentationDeckKey: 'generation-1',
      title: 'Gamma Lesson',
    });
    gammaService.getPresentationExport.mockResolvedValue({
      exportUrl: 'https://cdn.gamma.app/export.pptx',
    });
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(new Uint8Array([4, 5, 6]), {
        headers: { 'content-length': '3' },
        status: 200,
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const artifact = await GoogleDriveExportArtifactService.resolve({
      source: {
        kind: 'lesson_presentation',
        lessonId: '2b25a6da-09bc-4783-8a0d-60811389d612',
      },
      userId: 'user-1',
    });

    expect([...artifact.bytes]).toEqual([4, 5, 6]);
    expect(gammaService.getPresentationExport).toHaveBeenCalledWith(
      'generation-1'
    );
  });

  it('marks legacy Gamma references with a localized recovery reason', async () => {
    lessonService.getLessonById.mockResolvedValue({
      presentationDeckId: 'gamma:https://gamma.app/docs/legacy',
      presentationDeckKey: null,
      title: 'Legacy Gamma',
    });

    await expect(
      GoogleDriveExportArtifactService.resolve({
        source: {
          kind: 'lesson_presentation',
          lessonId: '2b25a6da-09bc-4783-8a0d-60811389d612',
        },
        userId: 'user-1',
      })
    ).rejects.toMatchObject({
      code: 'SOURCE_NOT_FOUND',
      details: { reason: 'LEGACY_GAMMA' },
    });
  });

  it('enforces course file permission before downloading inventory bytes', async () => {
    permissionService.mockResolvedValue({ withoutPermission: () => true });

    await expect(
      GoogleDriveExportArtifactService.resolve({
        source: {
          courseId: '1124d225-3284-4748-82d0-6f3a31ced5db',
          fileId: '2b25a6da-09bc-4783-8a0d-60811389d612',
          kind: 'inventory_file',
        },
        userId: 'user-1',
      })
    ).rejects.toMatchObject({ code: 'SOURCE_NOT_FOUND' });
    expect(storageService.getChatAttachmentPayloads).not.toHaveBeenCalled();
  });
});
