import { AssignmentSubmissionStatus } from '@/generated/prisma';
import {
  EMPTY_TIPTAP_DOCUMENT,
  isTiptapDocument,
} from '@/utils/lesson-content';

export function serializeFile<T extends { fileSize: bigint | null }>(file: T) {
  return {
    ...file,
    fileSize: file.fileSize === null ? null : Number(file.fileSize),
  };
}

export function serializeSubmission<
  T extends {
    files: Array<{
      file: {
        fileSize: bigint | null;
      };
    }>;
  },
>(submission: T) {
  return {
    ...submission,
    files: submission.files.map((entry) => ({
      ...entry,
      file: serializeFile(entry.file),
    })),
  };
}

export function normalizeAssignmentContent(content: unknown) {
  return isTiptapDocument(content) ? content : EMPTY_TIPTAP_DOCUMENT;
}

export function toStudentVisibleSubmissionSummary<T extends object>(
  submission: T,
  publishedResult: { score: number } | null | undefined
) {
  return {
    ...submission,
    status: publishedResult
      ? AssignmentSubmissionStatus.GRADED
      : AssignmentSubmissionStatus.SUBMITTED,
    score: publishedResult?.score ?? null,
  };
}

export function toStudentVisibleSubmission<
  T extends {
    files: Array<{
      file: {
        fileSize: bigint | null;
      };
    }>;
  },
>(
  submission: T,
  publishedResult: {
    score: number;
    feedback: string | null;
    publishedAt: Date;
  } | null
) {
  return {
    ...serializeSubmission(submission),
    status: publishedResult
      ? AssignmentSubmissionStatus.GRADED
      : AssignmentSubmissionStatus.SUBMITTED,
    score: publishedResult?.score ?? null,
    feedback: publishedResult?.feedback ?? null,
    gradedAt: publishedResult?.publishedAt ?? null,
    gradedById: null,
  };
}
