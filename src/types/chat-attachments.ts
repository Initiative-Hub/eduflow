import type { FileUIPart } from 'ai';

export type ChatFileUIPart = FileUIPart & {
  bucket: string | null;
  courseId?: string | null;
  fileId: string;
  fileSize: number | null;
  objectKey: string | null;
  source?: 'personal' | 'course';
};

export type ChatSubmitAttachments = {
  files: File[];
  referencedFiles: ChatFileUIPart[];
};
