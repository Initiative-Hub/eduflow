import type { FileUIPart, SourceDocumentUIPart } from 'ai';

export const EDUFLOW_METADATA_KEY = 'eduflow';
export const LESSON_REFERENCE_MEDIA_TYPE =
  'application/x-eduflow-lesson-reference';

export type FileMetadata = {
  bucket?: string | null;
  courseId?: string | null;
  fileId?: string;
  fileSize?: number | null;
  objectKey?: string | null;
  source?: 'personal' | 'course' | 'chat-upload';
};

export type LessonMetadata = {
  courseId?: string;
  courseTitle?: string;
  lessonId?: string;
  lessonTitle?: string;
  markdown?: string;
  moduleTitle?: string | null;
};

function getMetadataRecord(
  part: FileUIPart | SourceDocumentUIPart
): Record<string, unknown> {
  const metadata = part.providerMetadata?.[EDUFLOW_METADATA_KEY];
  return metadata && typeof metadata === 'object' && !Array.isArray(metadata)
    ? (metadata as Record<string, unknown>)
    : {};
}

export function getFileMetadata(part: FileUIPart): FileMetadata {
  return getMetadataRecord(part) as FileMetadata;
}

export function getLessonMetadata(
  part: SourceDocumentUIPart
): LessonMetadata | undefined {
  const metadata = getMetadataRecord(part);
  return metadata && Object.keys(metadata).length > 0
    ? (metadata as LessonMetadata)
    : undefined;
}

export function withChatMetadata<T extends FileUIPart | SourceDocumentUIPart>(
  part: T,
  metadata: FileMetadata | LessonMetadata
): T {
  return {
    ...part,
    providerMetadata: {
      ...part.providerMetadata,
      [EDUFLOW_METADATA_KEY]: {
        ...getMetadataRecord(part),
        ...metadata,
      },
    },
  } as T;
}

export function isStoredFilePart(part: FileUIPart) {
  return typeof getFileMetadata(part).fileId === 'string';
}

export function isLessonSourcePart(
  part: unknown
): part is SourceDocumentUIPart {
  if (
    !part ||
    typeof part !== 'object' ||
    !('type' in part) ||
    part.type !== 'source-document'
  ) {
    return false;
  }

  const source = part as SourceDocumentUIPart;
  return source.mediaType === LESSON_REFERENCE_MEDIA_TYPE;
}
