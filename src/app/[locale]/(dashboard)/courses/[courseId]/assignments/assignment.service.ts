import axios from 'axios';
import { apiClient } from '@/lib/api/api-client';
import type { TiptapDocument } from '@/utils/lesson-content';

export type AssignmentFile = {
  id: string;
  name: string;
  fileSize: number | null;
  mimeType: string | null;
  status: string;
};

export type AssignmentSubmission = {
  id: string;
  status: 'DRAFT' | 'SUBMITTED' | 'GRADED';
  submittedAt: string | null;
  score: number | null;
  feedback: string | null;
  files: Array<{
    id: string;
    file: AssignmentFile;
  }>;
};

export type Assignment = {
  id: string;
  courseId: string;
  title: string;
  content: TiptapDocument;
  dueAt: string | null;
  maxPoints: number;
  canEdit: boolean;
  canDelete: boolean;
  canGrade: boolean;
  submission: AssignmentSubmission | null;
};

export const assignmentService = {
  list: (courseId: string) =>
    apiClient.get<Assignment[]>(`/v1/courses/${courseId}/assignments`),

  get: (assignmentId: string) =>
    apiClient.get<Assignment>(`/v1/assignments/${assignmentId}`),

  create: (
    courseId: string,
    data: {
      title: string;
      content: TiptapDocument;
      dueAt: Date | null;
      maxPoints: number;
    }
  ) => apiClient.post<Assignment>(`/v1/courses/${courseId}/assignments`, data),

  update: (
    assignmentId: string,
    data: {
      title?: string;
      content?: TiptapDocument;
      dueAt?: Date | null;
      maxPoints?: number;
    }
  ) => apiClient.patch<Assignment>(`/v1/assignments/${assignmentId}`, data),

  initializeUpload: (assignmentId: string, file: File) =>
    apiClient.post<{
      data: {
        submissionId: string;
        fileId: string;
        uploadUrl: string;
        uploadHeaders: Record<string, string>;
      };
    }>(`/v1/assignments/${assignmentId}/submission/init-upload`, {
      fileName: file.name,
      contentType: file.type || 'application/octet-stream',
      fileSize: file.size,
    }),

  confirmUpload: (assignmentId: string, fileId: string) =>
    apiClient.post<{
      data: AssignmentFile;
    }>(`/v1/assignments/${assignmentId}/submission/confirm-upload`, { fileId }),

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
      `/v1/assignments/${assignmentId}/submission/submit`
    ),

  listSubmissions: (assignmentId: string) =>
    apiClient.get<AssignmentSubmission[]>(
      `/v1/assignments/${assignmentId}/submissions`
    ),

  grade: (submissionId: string, data: { score: number; feedback?: string }) =>
    apiClient.patch<AssignmentSubmission>(
      `/v1/assignment-submissions/${submissionId}/grade`,
      data
    ),

  fileDownloadUrl: (fileId: string) =>
    `/api/v1/assignment-files/${fileId}/download`,
};
