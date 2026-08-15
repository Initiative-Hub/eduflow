import { getCoursePermissions } from '@/lib/permissions/course-permission';
import { COURSE_PERMISSION } from '@/lib/permissions/permission-keys';
import { prisma } from '@/lib/prisma';
import type { GoogleDriveExportSource } from '@/lib/validations/google-drive-export.schema';
import {
  savedVocabularyListInclude,
  toSavedVocabularyItem,
} from '@/services/english/wordbank/mappers';
import { LessonPresentationService } from '@/services/LessonPresentationService';
import { LessonService } from '@/services/LessonService';
import { StorageService } from '@/services/StorageService';
import { StudyShareService } from '@/services/StudyShareService';
import {
  createInteractiveContentDownloadFilename,
  createSecureInteractiveContentDocument,
} from '@/utils/study-interactive-content';
import { createWordbankCsvArtifact } from '@/utils/wordbank-csv';
import { GoogleDriveExportError } from './GoogleDriveExportError';
import type { GoogleDriveExportArtifact } from './GoogleDriveExportService';

const PPTX_MIME_TYPE =
  'application/vnd.openxmlformats-officedocument.presentationml.presentation';

function safePresentationFileName(title: string) {
  const normalized = title
    .normalize('NFKD')
    .replaceAll(/[^\w\s-]/g, '')
    .trim()
    .replaceAll(/\s+/g, '-')
    .toLowerCase();
  return `${normalized || 'lesson-presentation'}.pptx`;
}

async function resolveWordbank(
  source: Extract<GoogleDriveExportSource, { kind: 'wordbank_csv' }>,
  userId: string
): Promise<GoogleDriveExportArtifact> {
  const rows = await prisma.savedVocabulary.findMany({
    include: savedVocabularyListInclude,
    where: { id: { in: source.vocabularyIds }, userId },
  });
  if (rows.length !== new Set(source.vocabularyIds).size) {
    throw new GoogleDriveExportError(
      'SOURCE_NOT_FOUND',
      'One or more vocabulary items could not be found.'
    );
  }

  const byId = new Map(rows.map((row) => [row.id, row]));
  const orderedItems = source.vocabularyIds.map((id) => {
    const row = byId.get(id);
    if (!row) {
      throw new GoogleDriveExportError(
        'SOURCE_NOT_FOUND',
        'One or more vocabulary items could not be found.'
      );
    }
    return toSavedVocabularyItem(row);
  });
  const csv = createWordbankCsvArtifact(orderedItems, source.labels);
  return {
    bytes: new TextEncoder().encode(csv.content),
    fileName: source.fileName,
    mimeType: csv.mimeType,
    sourceKind: source.kind,
  };
}

async function resolveStudyHtml(
  source: Extract<GoogleDriveExportSource, { kind: 'study_interactive_html' }>,
  userId: string
): Promise<GoogleDriveExportArtifact> {
  const resolved = await StudyShareService.getOwnedInteractiveContent({
    chatId: source.chatId,
    content: source.content,
    contentIndex: source.contentIndex,
    messageId: source.messageId,
    userId,
  });
  if (!resolved) {
    throw new GoogleDriveExportError(
      'SOURCE_NOT_FOUND',
      'Interactive study content could not be found.'
    );
  }
  const html = createSecureInteractiveContentDocument(resolved.content.html);
  return {
    bytes: new TextEncoder().encode(html),
    fileName:
      source.fileName ||
      createInteractiveContentDownloadFilename(resolved.content.title),
    mimeType: 'text/html;charset=utf-8',
    sourceKind: source.kind,
  };
}

async function resolveLessonPresentation(
  source: Extract<GoogleDriveExportSource, { kind: 'lesson_presentation' }>,
  userId: string
): Promise<GoogleDriveExportArtifact> {
  let lesson: any;
  try {
    lesson = await LessonService.getLessonById(source.lessonId, userId);
  } catch {
    throw new GoogleDriveExportError(
      'SOURCE_NOT_FOUND',
      'The lesson presentation could not be found.'
    );
  }
  if (!lesson.presentationDeckId) {
    throw new GoogleDriveExportError(
      'SOURCE_NOT_FOUND',
      'The lesson does not have a saved presentation.'
    );
  }

  if (lesson.presentationDeckId.startsWith('gamma:')) {
    throw new GoogleDriveExportError(
      'SOURCE_NOT_FOUND',
      'This legacy Gamma presentation is no longer supported. Please regenerate using System Slides.',
      { reason: 'LEGACY_GAMMA' }
    );
  }

  const bytes = new Uint8Array(
    await LessonPresentationService.getDeckPptx(lesson.presentationDeckId)
  );

  return {
    bytes,
    fileName: safePresentationFileName(lesson.title),
    mimeType: PPTX_MIME_TYPE,
    sourceKind: source.kind,
  };
}

async function resolveInventoryFile(
  source: Extract<GoogleDriveExportSource, { kind: 'inventory_file' }>,
  userId: string
): Promise<GoogleDriveExportArtifact> {
  if (source.courseId) {
    const permissions = await getCoursePermissions(userId, source.courseId);
    if (permissions.withoutPermission(COURSE_PERMISSION.COURSE_FILES_VIEW)) {
      throw new GoogleDriveExportError(
        'SOURCE_NOT_FOUND',
        'The inventory file could not be found.'
      );
    }
  }

  const files = await StorageService.getChatAttachmentPayloads({
    fileIds: [source.fileId],
    fileRefs: source.courseId
      ? [{ courseId: source.courseId, fileId: source.fileId }]
      : undefined,
    userId,
  });
  const file = files[0];
  if (!file) {
    throw new GoogleDriveExportError(
      'SOURCE_NOT_FOUND',
      'The inventory file could not be found.'
    );
  }
  return {
    bytes: file.bytes,
    fileName: file.name,
    mimeType: file.mimeType,
    sourceKind: source.kind,
  };
}

export class GoogleDriveExportArtifactService {
  static async resolve(options: {
    source: GoogleDriveExportSource;
    userId: string;
  }): Promise<GoogleDriveExportArtifact> {
    switch (options.source.kind) {
      case 'wordbank_csv':
        return resolveWordbank(options.source, options.userId);
      case 'study_interactive_html':
        return resolveStudyHtml(options.source, options.userId);
      case 'lesson_presentation':
        return resolveLessonPresentation(options.source, options.userId);
      case 'inventory_file':
        return resolveInventoryFile(options.source, options.userId);
      default:
        throw new GoogleDriveExportError(
          'SOURCE_NOT_FOUND',
          'The export source could not be found.'
        );
    }
  }
}
