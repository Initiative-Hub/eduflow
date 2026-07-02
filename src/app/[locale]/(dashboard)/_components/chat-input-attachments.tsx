'use client';

import {
  BookOpenIcon,
  FileTextIcon,
  GlobeIcon,
  ImageIcon,
  Music2Icon,
  PaperclipIcon,
  VideoIcon,
} from 'lucide-react';
import {
  Attachment,
  AttachmentHoverCard,
  AttachmentHoverCardContent,
  AttachmentHoverCardTrigger,
  type AttachmentMediaCategory,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
  getAttachmentLabel,
  getMediaCategory,
} from '@/components/ai-elements/attachments';
import {
  usePromptInputController,
  usePromptInputReferencedSources,
} from '@/components/ai-elements/prompt-input';

export interface ChatAttachmentItem {
  filename: string;
  id: string;
  kind?: 'file' | 'lesson';
  mediaType: string;
  previewUrl: string;
}

interface AttachmentGridProps {
  files: ChatAttachmentItem[];
  getRemoveLabel?: (fileName: string) => string;
  onRemove?: (fileId: string) => void;
}

const mediaCategoryIcons: Record<AttachmentMediaCategory, typeof ImageIcon> = {
  audio: Music2Icon,
  document: FileTextIcon,
  image: ImageIcon,
  source: GlobeIcon,
  unknown: PaperclipIcon,
  video: VideoIcon,
};

function AttachmentFallback({
  customIcon: CustomIcon,
  mediaCategory,
  label,
}: {
  customIcon?: typeof ImageIcon;
  mediaCategory: AttachmentMediaCategory;
  label: string;
}) {
  const Icon = CustomIcon ?? mediaCategoryIcons[mediaCategory];

  return (
    <div className="flex size-full flex-col items-center justify-center gap-1 px-2 text-center">
      <Icon className="size-5 text-muted-foreground" />
      <span className="w-full truncate text-xs">{label}</span>
    </div>
  );
}

function AttachmentMetadata({
  mediaType,
  label,
}: {
  mediaType: string;
  label: string;
}) {
  return (
    <div className="min-w-0 space-y-0.5">
      <div className="max-w-56 truncate font-medium text-sm">{label}</div>
      <div className="max-w-56 truncate text-muted-foreground text-xs">
        {mediaType}
      </div>
    </div>
  );
}

function AttachmentGrid({
  files,
  getRemoveLabel,
  onRemove,
}: AttachmentGridProps) {
  if (files.length === 0) {
    return null;
  }

  return (
    <Attachments className="m-0" variant="grid">
      {files.map((item) => {
        const isLesson = item.kind === 'lesson';
        const attachment = {
          filename: item.filename,
          id: item.id,
          mediaType: item.mediaType,
          type: 'file' as const,
          url: item.previewUrl,
        };
        const label = getAttachmentLabel(attachment);
        const mediaCategory = getMediaCategory(attachment);
        const displayLabel = isLesson ? item.filename : label;

        return (
          <AttachmentHoverCard key={item.id}>
            <AttachmentHoverCardTrigger asChild>
              <Attachment
                data={attachment}
                onRemove={() => onRemove?.(item.id)}
              >
                <AttachmentPreview
                  fallbackIcon={
                    <AttachmentFallback
                      customIcon={isLesson ? BookOpenIcon : undefined}
                      mediaCategory={mediaCategory}
                      label={displayLabel}
                    />
                  }
                />
                {getRemoveLabel && onRemove ? (
                  <AttachmentRemove label={getRemoveLabel(item.filename)} />
                ) : null}
              </Attachment>
            </AttachmentHoverCardTrigger>
            <AttachmentHoverCardContent>
              <AttachmentMetadata
                label={displayLabel}
                mediaType={attachment.mediaType}
              />
            </AttachmentHoverCardContent>
          </AttachmentHoverCard>
        );
      })}
    </Attachments>
  );
}

interface ComposerAttachmentProps {
  getRemoveLabel?: (fileName: string) => string;
}

export function ChatInputAttachments({
  getRemoveLabel,
}: ComposerAttachmentProps) {
  const controller = usePromptInputController();
  const files = controller.attachments.files.map((item) => ({
    filename: item.filename ?? item.id,
    id: item.id,
    mediaType: item.mediaType,
    previewUrl: item.url,
  }));

  return (
    <AttachmentGrid
      files={files}
      getRemoveLabel={getRemoveLabel}
      onRemove={controller.attachments.remove}
    />
  );
}

export function ChatInputReferencedSources({
  getRemoveLabel,
}: ComposerAttachmentProps) {
  const referencedSources = usePromptInputReferencedSources();
  const files = referencedSources.sources.map((item) => ({
    filename: item.title,
    id: item.id,
    kind: 'lesson' as const,
    mediaType: item.mediaType,
    previewUrl: `source:${item.sourceId}`,
  }));

  return (
    <AttachmentGrid
      files={files}
      getRemoveLabel={getRemoveLabel}
      onRemove={referencedSources.remove}
    />
  );
}

export function ChatInventoryReferenceAttachments(props: AttachmentGridProps) {
  return <AttachmentGrid {...props} />;
}

export function ChatMessageAttachments(props: AttachmentGridProps) {
  return <AttachmentGrid {...props} />;
}
