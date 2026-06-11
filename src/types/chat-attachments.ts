import type { FileUIPart } from 'ai';

export type ChatFileUIPart = FileUIPart & {
  bucket: string | null;
  fileId: string;
  fileSize: number | null;
  objectKey: string | null;
};
