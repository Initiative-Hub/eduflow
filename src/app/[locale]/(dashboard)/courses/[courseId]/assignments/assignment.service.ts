import axios from 'axios';
import { apiClient } from '@/lib/api/api-client';
import { ASSIGNMENT_API_ROUTES } from '@/lib/api/routes';
import type { TiptapDocument } from '@/utils/lesson-content';

export type AssignmentFile = {
  id: string;
  name: string;
  fileSize: number | null;
  mimeType: string | null;
  status: string;
};

export type TeacherAssignmentStudent = {
  id: string;
  name: string;
  email: string;
  image: string | null;
};

export type FeedbackTone = 'constructive' | 'concise' | 'encouraging';
export type FinalizedAssignmentSubmission = Omit<
  AssignmentSubmission,
  'status'
> & {
  status: 'SUBMITTED' | 'GRADED';
};

export type TeacherSubmissionRosterItem = {
  student: TeacherAssignmentStudent;
  submission: FinalizedAssignmentSubmission | null;

  publishedResult: {
    sourceSubmissionId: string | null;
    score: number;
    feedback: string | null;
    publishedAt: string;
  } | null;
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
  draftSubmission: AssignmentSubmission | null;
};

export type AssignmentSubmissionSummary = {
  total: number;
  pending: number;
  graded: number;
};

export type AssignmentListItem = Omit<
  Assignment,
  'submission' | 'draftSubmission'
> & {
  submission: Pick<AssignmentSubmission, 'status' | 'score'> | null;
  draftSubmission: Pick<AssignmentSubmission, 'status'> | null;
  submissionSummary: AssignmentSubmissionSummary | null;
};

export type PublishAssignmentResultsResponse = {
  data: {
    publishedCount: number;
    publishedAt: string | null;
  };
};

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
    apiClient.post<{
      data: {
        submissionId: string;
        fileId: string;
        uploadUrl: string;
        uploadHeaders: Record<string, string>;
      };
    }>(ASSIGNMENT_API_ROUTES.INITIALIZE_UPLOAD(assignmentId), {
      fileName: file.name,
      contentType: file.type || 'application/octet-stream',
      fileSize: file.size,
    }),

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
      data
    ),

  publishResults: (assignmentId: string) =>
    apiClient.post<PublishAssignmentResultsResponse>(
      ASSIGNMENT_API_ROUTES.PUBLISH_RESULTS(assignmentId)
    ),
};
