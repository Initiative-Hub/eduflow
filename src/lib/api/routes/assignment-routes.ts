import { API_PREFIX } from '../endpoints';

const ASSIGNMENTS_API_PREFIX = `${API_PREFIX}/assignments`;

const assignmentPath = (assignmentId: string) =>
  `${ASSIGNMENTS_API_PREFIX}/${assignmentId}`;

export const ASSIGNMENT_API_ROUTES = {
  COURSE_ASSIGNMENTS: (courseId: string) =>
    `${API_PREFIX}/courses/${courseId}/assignments`,
  ASSIGNMENT: assignmentPath,
  INITIALIZE_UPLOAD: (assignmentId: string) =>
    `${assignmentPath(assignmentId)}/submission/init-upload`,
  CONFIRM_UPLOAD: (assignmentId: string) =>
    `${assignmentPath(assignmentId)}/submission/confirm-upload`,
  SUBMIT: (assignmentId: string) =>
    `${assignmentPath(assignmentId)}/submission/submit`,
  SUBMISSIONS: (assignmentId: string) =>
    `${assignmentPath(assignmentId)}/submissions`,
  GRADE_SUBMISSION: (submissionId: string) =>
    `${API_PREFIX}/assignment-submissions/${submissionId}/grade`,
  FILE_DOWNLOAD: (fileId: string) =>
    `/api${API_PREFIX}/assignment-files/${fileId}/download`,
  REWRITE_FEEDBACK: (submissionId: string) =>
    `${API_PREFIX}/ai/assignment-submissions/${submissionId}/feedback/rewrite`,
  PUBLISH_RESULTS: (assignmentId: string) =>
    `${assignmentPath(assignmentId)}/results/publish`,
} as const;
