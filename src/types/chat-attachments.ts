import type { FileUIPart } from 'ai';
import type { ChatLessonReferenceUIPart } from '@/types/chat-lesson-references';

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
  referencedLessons?: ChatLessonReferenceUIPart[];
  referencedFiles: ChatFileUIPart[];
};
