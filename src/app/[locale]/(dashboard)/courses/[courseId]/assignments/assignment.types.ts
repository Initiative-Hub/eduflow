import type { TiptapDocument } from '@/utils/lesson-content';

export type AssignmentSubmissionStatus = 'DRAFT' | 'SUBMITTED' | 'GRADED';

export type AssignmentFile = {
  id: string;
  name: string;
  fileSize: number | null;
  mimeType: string | null;
  status: string;
};

export type AssignmentSubmissionFile = {
  id: string;
  file: AssignmentFile;
};

export type AssignmentSubmission = {
  id: string;
  status: AssignmentSubmissionStatus;
  submittedAt: string | null;
  score: number | null;
  feedback: string | null;
  files: AssignmentSubmissionFile[];
};

export type FinalizedAssignmentSubmission = Omit<
  AssignmentSubmission,
  'status'
> & {
  status: Exclude<AssignmentSubmissionStatus, 'DRAFT'>;
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

export type TeacherAssignmentStudent = {
  id: string;
  name: string;
  email: string;
  image: string | null;
};

export type PublishedAssignmentResult = {
  sourceSubmissionId: string | null;
  score: number;
  feedback: string | null;
  publishedAt: string;
};

export type TeacherSubmissionRosterItem = {
  student: TeacherAssignmentStudent;
  submission: FinalizedAssignmentSubmission | null;
  publishedResult: PublishedAssignmentResult | null;
};

export type FeedbackTone = 'constructive' | 'concise' | 'encouraging';
