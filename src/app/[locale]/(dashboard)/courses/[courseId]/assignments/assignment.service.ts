import axios from 'axios';
import { apiClient } from '@/lib/api/api-client';
import { ASSIGNMENT_API_ROUTES } from '@/lib/api/routes';
import type { TiptapDocument } from '@/utils/lesson-content';
import type {
  Assignment,
  AssignmentFile,
  AssignmentListItem,
  AssignmentSubmission,
  FeedbackTone,
  TeacherSubmissionRosterItem,
} from './assignment.types';

type InitializeSubmissionUploadResponse = {
  data: {
    submissionId: string;
    fileId: string;
    uploadUrl: string;
    uploadHeaders: Record<string, string>;
  };
};

type PublishAssignmentResultsResponse = {
  data: {
    publishedCount: number;
    publishedAt: string | null;
  };
};

const FEEDBACK_REWRITE_REQUEST_TIMEOUT_MS = 70_000;

export const assignmentService = {
  list: (courseId: string) =>
    apiClient.get<AssignmentListItem[]>(
      ASSIGNMENT_API_ROUTES.COURSE_ASSIGNMENTS(courseId)
    ),

  get: (assignmentId: string) =>
    apiClient.get<Assignment>(ASSIGNMENT_API_ROUTES.ASSIGNMENT(assignmentId)),

  create: (
    courseId: string,
    data: {
      title: string;
      content: TiptapDocument;
      dueAt: Date | null;
      maxPoints: number;
    }
  ) =>
    apiClient.post<Assignment>(
      ASSIGNMENT_API_ROUTES.COURSE_ASSIGNMENTS(courseId),
      data
    ),

  update: (
    assignmentId: string,
    data: {
      title?: string;
      content?: TiptapDocument;
      dueAt?: Date | null;
      maxPoints?: number;
    }
  ) =>
    apiClient.patch<Assignment>(
      ASSIGNMENT_API_ROUTES.ASSIGNMENT(assignmentId),
      data
    ),

  initializeUpload: (assignmentId: string, file: File) =>
    apiClient.post<InitializeSubmissionUploadResponse>(
      ASSIGNMENT_API_ROUTES.INITIALIZE_UPLOAD(assignmentId),
      {
        fileName: file.name,
        contentType: file.type || 'application/octet-stream',
        fileSize: file.size,
      }
    ),

  confirmUpload: (assignmentId: string, fileId: string) =>
    apiClient.post<{
      data: AssignmentFile;
    }>(ASSIGNMENT_API_ROUTES.CONFIRM_UPLOAD(assignmentId), {
      fileId,
    }),

  uploadSubmissionFile: async (
    assignmentId: string,
    file: File,
    onProgress?: (progress: number) => void
  ) => {
    const initialized = await assignmentService.initializeUpload(
      assignmentId,
      file
    );

    await axios.put(initialized.data.uploadUrl, file, {
      headers: initialized.data.uploadHeaders,
      onUploadProgress: (event) => {
        if (!event.total) return;

        onProgress?.(Math.round((event.loaded / event.total) * 100));
      },
    });

    return assignmentService.confirmUpload(
      assignmentId,
      initialized.data.fileId
    );
  },

  submit: (assignmentId: string) =>
    apiClient.post<AssignmentSubmission>(
      ASSIGNMENT_API_ROUTES.SUBMIT(assignmentId)
    ),

  removeDraftFile: (assignmentId: string, fileId: string) =>
    apiClient.delete<void>(
      ASSIGNMENT_API_ROUTES.REMOVE_DRAFT_FILE(assignmentId, fileId)
    ),

  listSubmissionRoster: (assignmentId: string) =>
    apiClient.get<TeacherSubmissionRosterItem[]>(
      ASSIGNMENT_API_ROUTES.SUBMISSIONS(assignmentId)
    ),

  grade: (submissionId: string, data: { score: number; feedback?: string }) =>
    apiClient.patch<AssignmentSubmission>(
      ASSIGNMENT_API_ROUTES.GRADE_SUBMISSION(submissionId),
      data
    ),

  fileDownloadUrl: (fileId: string) =>
    ASSIGNMENT_API_ROUTES.FILE_DOWNLOAD(fileId),

  rewriteFeedback: (
    submissionId: string,
    data: {
      feedback: string;
      tone: FeedbackTone;
    }
  ) =>
    apiClient.post<{ suggestion: string }>(
      ASSIGNMENT_API_ROUTES.REWRITE_FEEDBACK(submissionId),
      data,
      { timeout: FEEDBACK_REWRITE_REQUEST_TIMEOUT_MS }
    ),

  publishResults: (assignmentId: string) =>
    apiClient.post<PublishAssignmentResultsResponse>(
      ASSIGNMENT_API_ROUTES.PUBLISH_RESULTS(assignmentId)
    ),
};
