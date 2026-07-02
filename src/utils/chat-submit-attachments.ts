import type { FileUIPart, SourceDocumentUIPart } from 'ai';

export type ChatSubmitAttachments = {
  files: FileUIPart[];
  sources: SourceDocumentUIPart[];
};

export const EMPTY_CHAT_SUBMIT_ATTACHMENTS: ChatSubmitAttachments = {
  files: [],
  sources: [],
};
