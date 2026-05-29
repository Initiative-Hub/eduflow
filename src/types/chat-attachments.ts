import type { FileUIPart } from 'ai';

export type ChatFileUIPart = FileUIPart & {
  bucket?: string;
  fileId?: string;
  fileSize?: number | null;
  objectKey?: string;
};
