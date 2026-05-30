'use client';

import {
  Attachment,
  AttachmentInfo,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
} from '@/components/ai-elements/attachments';

const DEFAULT_MEDIA_TYPE = 'application/octet-stream';

export interface SelectedChatFile {
  file: File;
  id: string;
  previewUrl: string;
}

interface ChatInputAttachmentsProps {
  files: SelectedChatFile[];
  getRemoveLabel: (fileName: string) => string;
  onRemove: (fileId: string) => void;
}

export function ChatInputAttachments({
  files,
  getRemoveLabel,
  onRemove,
}: ChatInputAttachmentsProps) {
  if (files.length === 0) {
    return null;
  }

  return (
    <Attachments className="max-w-full" variant="inline">
      {files.map((item) => (
        <Attachment
          data={{
            filename: item.file.name,
            id: item.id,
            mediaType: item.file.type || DEFAULT_MEDIA_TYPE,
            type: 'file',
            url: item.previewUrl,
          }}
          key={item.id}
          onRemove={() => onRemove(item.id)}
        >
          <AttachmentPreview />
          <AttachmentInfo />
          <AttachmentRemove label={getRemoveLabel(item.file.name)} />
        </Attachment>
      ))}
    </Attachments>
  );
}
