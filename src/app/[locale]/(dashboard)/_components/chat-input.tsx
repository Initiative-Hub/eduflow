'use client';

import type { FileUIPart, SourceDocumentUIPart } from 'ai';
import {
  ArrowUp,
  Cloud,
  FolderOpen,
  HardDrive,
  Library,
  Loader2,
  Paperclip,
  Plus,
  Settings2,
  Square,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  type Dispatch,
  type FormEvent,
  type ReactNode,
  type RefObject,
  type SetStateAction,
  useEffect,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputHeader,
  type PromptInputMessage,
  PromptInputProvider,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputController,
  usePromptInputReferencedSources,
} from '@/components/ai-elements/prompt-input';
import { DropdownTemplate, type MenuItem } from '@/components/custom/dropdown';
import { Button } from '@/components/ui/button';
import type { ChatModel } from '@/services/ai/chat-models';
import { getFileMetadata } from '@/utils/chat-part-metadata';
import type { ChatSubmitAttachments } from '@/utils/chat-submit-attachments';
import { STORAGE_MAX_FILE_SIZE_BYTES } from '../inventory/inventory.types';
import {
  type ChatAttachmentItem,
  ChatInputAttachments,
  ChatInputReferencedSources,
  ChatInventoryReferenceAttachments,
} from './chat-input-attachments';
import { ChatInventoryAttachmentDialog } from './chat-inventory-attachment-dialog';
import { ChatModelSelectControl } from './chat-model-select-control';

const MAX_CHAT_ATTACHMENTS = 10;

export type ChatInputToolsContext = {
  disabled: boolean;
  disabledLessonIds: string[];
  maxSelectable: number;
  onAttachLessonReferences: (sources: SourceDocumentUIPart[]) => void;
};

interface ChatInputProps {
  handleSubmit: (
    e?: FormEvent,
    customValue?: string,
    attachments?: ChatSubmitAttachments
  ) => Promise<void> | void;
  isStreaming: boolean;
  isUploading: boolean;
  isChatting: boolean;
  isLimitReached: boolean;
  isAuthenticated: boolean;
  limitCount: number;
  userMessageCount: number;
  onStop: () => void;
  selectedModel?: ChatModel;
  onModelChange?: (model: ChatModel) => void;
  placeholder?: string;
  tools?: ReactNode | ((context: ChatInputToolsContext) => ReactNode);
  footer?: ReactNode;
}

type SubmitSnapshot = {
  sources: SourceDocumentUIPart[];
};

type SelectedInventoryReferenceFile = ChatAttachmentItem & {
  filePart?: FileUIPart;
};

type ChatInputContentProps = ChatInputProps & {
  pickerSource: 'personal' | 'course' | null;
  selectedAttachmentCount: number;
  selectedReferenceFiles: SelectedInventoryReferenceFile[];
  setLessonCount: Dispatch<SetStateAction<number>>;
  setPickerSource: Dispatch<SetStateAction<'personal' | 'course' | null>>;
  setSelectedReferenceFiles: Dispatch<
    SetStateAction<SelectedInventoryReferenceFile[]>
  >;
  submitSnapshotRef: RefObject<SubmitSnapshot>;
};

function ChatInputContent({
  isStreaming,
  isUploading,
  isLimitReached,
  isAuthenticated,
  onStop,
  selectedModel,
  onModelChange,
  placeholder,
  tools,
  pickerSource,
  selectedAttachmentCount,
  selectedReferenceFiles,
  setLessonCount,
  setPickerSource,
  setSelectedReferenceFiles,
  submitSnapshotRef,
}: ChatInputContentProps) {
  const t = useTranslations('AIChat');
  const controller = usePromptInputController();
  const referencedSources = usePromptInputReferencedSources();
  const remainingAttachmentSlots = Math.max(
    0,
    MAX_CHAT_ATTACHMENTS - selectedAttachmentCount
  );
  const disabledLessonIds = referencedSources.sources.map(
    (item) => item.sourceId
  );

  useEffect(() => {
    setLessonCount(referencedSources.sources.length);
    submitSnapshotRef.current = {
      sources: referencedSources.sources,
    };
  }, [referencedSources.sources, setLessonCount, submitSnapshotRef]);

  const openInventoryPicker = (source: 'personal' | 'course') => {
    if (remainingAttachmentSlots === 0) {
      toast.error(t('attachments.tooMany', { count: MAX_CHAT_ATTACHMENTS }));
      return;
    }

    setPickerSource(source);
  };

  const addReferenceFiles = (files: FileUIPart[]) => {
    if (files.length === 0) return;

    setSelectedReferenceFiles((current) => {
      const existingIds = new Set(current.map((item) => item.id));
      const capacity = Math.max(
        0,
        MAX_CHAT_ATTACHMENTS -
          controller.attachments.files.length -
          referencedSources.sources.length -
          current.length
      );
      const accepted = files
        .filter((file) => {
          const fileId = getFileMetadata(file).fileId ?? file.url;
          return !existingIds.has(fileId);
        })
        .slice(0, capacity)
        .map((file) => {
          const fileId = getFileMetadata(file).fileId ?? file.url;
          return {
            filePart: file,
            filename: file.filename ?? fileId,
            id: fileId,
            mediaType: file.mediaType,
            previewUrl: file.url,
          };
        });

      if (files.length > accepted.length) {
        toast.error(t('attachments.tooMany', { count: MAX_CHAT_ATTACHMENTS }));
      }

      return [...current, ...accepted];
    });
  };

  const addReferenceLessons = (sources: SourceDocumentUIPart[]) => {
    if (sources.length === 0) return;

    const existingIds = new Set(
      referencedSources.sources.map((item) => item.sourceId)
    );
    const accepted = sources
      .filter((source) => !existingIds.has(source.sourceId))
      .slice(0, remainingAttachmentSlots);

    if (sources.length > accepted.length) {
      toast.error(t('attachments.tooMany', { count: MAX_CHAT_ATTACHMENTS }));
    }

    if (accepted.length === 0) return;

    referencedSources.add(accepted);
  };

  const renderedTools =
    typeof tools === 'function'
      ? tools({
          disabled:
            !isAuthenticated || isStreaming || isUploading || isLimitReached,
          disabledLessonIds,
          maxSelectable: remainingAttachmentSlots,
          onAttachLessonReferences: addReferenceLessons,
        })
      : tools;

  const actionMenuItems: MenuItem[] = [
    {
      type: 'submenu',
      label: t('actionMenu.uploadFiles'),
      icon: <Paperclip />,
      className: 'rounded-2xl',
      items: [
        {
          label: t('actionMenu.fromUserInventory'),
          icon: <FolderOpen />,
          onClick: () => openInventoryPicker('personal'),
        },
        {
          label: t('actionMenu.fromCourseInventory'),
          icon: <Cloud />,
          onClick: () => openInventoryPicker('course'),
        },
        {
          label: t('actionMenu.fromDevice'),
          icon: <HardDrive />,
          onClick: () => controller.attachments.openFileDialog(),
        },
      ],
    },
  ];

  return (
    <>
      {selectedAttachmentCount > 0 && (
        <PromptInputHeader>
          <ChatInputAttachments
            getRemoveLabel={(fileName) =>
              t('attachments.remove', { name: fileName })
            }
          />
          <ChatInputReferencedSources
            getRemoveLabel={(fileName) =>
              t('attachments.remove', { name: fileName })
            }
          />
          {selectedReferenceFiles.length > 0 && (
            <ChatInventoryReferenceAttachments
              files={selectedReferenceFiles}
              getRemoveLabel={(fileName) =>
                t('attachments.remove', { name: fileName })
              }
              onRemove={(fileId) =>
                setSelectedReferenceFiles((current) =>
                  current.filter((item) => item.id !== fileId)
                )
              }
            />
          )}
        </PromptInputHeader>
      )}

      <PromptInputBody>
        <PromptInputTextarea
          className="min-h-11 px-2 py-2.5 text-base leading-normal placeholder:text-foreground sm:text-lg"
          disabled={isLimitReached}
          placeholder={placeholder ?? t('placeholder')}
        />
      </PromptInputBody>

      <PromptInputFooter className="flex items-center justify-between gap-2 px-1 pb-0.5">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          {isAuthenticated ? (
            <DropdownTemplate
              align="start"
              className="w-56 rounded-2xl p-1.5"
              items={actionMenuItems}
              trigger={
                <Button
                  aria-label={t('actionMenu.open')}
                  className="size-9 rounded-full text-foreground transition-colors hover:bg-muted"
                  disabled={isStreaming || isUploading || isLimitReached}
                  size="icon-sm"
                  type="button"
                  variant="ghost"
                >
                  <Plus className="size-4.5" />
                </Button>
              }
            />
          ) : null}
          {renderedTools ? (
            <PromptInputTools className="min-w-0 gap-1.5">
              {renderedTools}
            </PromptInputTools>
          ) : null}
          {selectedModel && onModelChange ? (
            <div className="ml-auto min-w-0">
              <ChatModelSelectControl
                disabled={isStreaming || isUploading}
                emptyLabel={t('modelSelector.empty')}
                heading={t('modelSelector.heading')}
                label={t('modelSelector.label')}
                onModelChange={onModelChange}
                selectedModel={selectedModel}
              />
            </div>
          ) : null}
        </div>

        <PromptInputSubmit
          className="size-9 shrink-0 cursor-pointer rounded-full transition-all hover:scale-105"
          disabled={
            isLimitReached ||
            isUploading ||
            (!isStreaming &&
              !controller.textInput.value.trim() &&
              selectedAttachmentCount === 0)
          }
          onStop={onStop}
          status={
            isUploading ? 'submitted' : isStreaming ? 'streaming' : 'ready'
          }
          variant={isStreaming ? 'destructive' : 'default'}
        >
          {isUploading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : isStreaming ? (
            <Square className="size-4" />
          ) : (
            <ArrowUp className="size-5" />
          )}
        </PromptInputSubmit>
      </PromptInputFooter>

      <ChatInventoryAttachmentDialog
        disabledFileIds={selectedReferenceFiles.flatMap((item) =>
          item.filePart ? [item.id] : []
        )}
        maxSelectable={remainingAttachmentSlots}
        onAttach={addReferenceFiles}
        onOpenChange={(open) => setPickerSource(open ? pickerSource : null)}
        open={pickerSource === 'personal'}
        source="personal"
      />
      <ChatInventoryAttachmentDialog
        disabledFileIds={selectedReferenceFiles.flatMap((item) =>
          item.filePart ? [item.id] : []
        )}
        maxSelectable={remainingAttachmentSlots}
        onAttach={addReferenceFiles}
        onOpenChange={(open) => setPickerSource(open ? pickerSource : null)}
        open={pickerSource === 'course'}
        source="course"
      />
    </>
  );
}

function ChatInputComposer({
  handleSubmit,
  isStreaming,
  isUploading,
  isChatting,
  isLimitReached,
  limitCount,
  userMessageCount,
  footer,
  defaultFooter,
  ...props
}: ChatInputProps & { defaultFooter: ReactNode }) {
  const t = useTranslations('AIChat');
  const controller = usePromptInputController();
  const [pickerSource, setPickerSource] = useState<
    'personal' | 'course' | null
  >(null);
  const [selectedReferenceFiles, setSelectedReferenceFiles] = useState<
    SelectedInventoryReferenceFile[]
  >([]);
  const [lessonCount, setLessonCount] = useState(0);
  const submitSnapshotRef = useRef<SubmitSnapshot>({
    sources: [],
  });
  const selectedAttachmentCount =
    controller.attachments.files.length +
    selectedReferenceFiles.length +
    lessonCount;

  const onPromptSubmit = async (message: PromptInputMessage) => {
    const text = message.text.trim();
    if (
      isStreaming ||
      isUploading ||
      isLimitReached ||
      (!text && selectedAttachmentCount === 0)
    ) {
      return;
    }

    try {
      await handleSubmit(undefined, message.text, {
        files: [
          ...message.files,
          ...selectedReferenceFiles.flatMap((item) =>
            item.filePart ? [item.filePart] : []
          ),
        ],
        sources: submitSnapshotRef.current.sources,
      });
      setSelectedReferenceFiles([]);
      submitSnapshotRef.current = { sources: [] };
    } catch {
      // Keep the draft and attachments so the user can retry.
    }
  };

  return (
    <div className="space-y-4 transition-all duration-200">
      <div className="group mx-auto max-w-3xl">
        <PromptInput
          className="*:data-[slot=input-group]:rounded-4xl *:data-[slot=input-group]:border *:data-[slot=input-group]:border-border/80 *:data-[slot=input-group]:bg-background! *:data-[slot=input-group]:px-2.5 *:data-[slot=input-group]:py-2 *:data-[slot=input-group]:shadow-sm *:data-[slot=input-group]:transition-all *:data-[slot=input-group]:group-focus-within:border-primary/70 *:data-[slot=input-group]:group-focus-within:shadow-md *:data-[slot=input-group]:group-focus-within:ring-4 *:data-[slot=input-group]:group-focus-within:ring-primary/10"
          maxFileSize={STORAGE_MAX_FILE_SIZE_BYTES}
          maxFiles={
            MAX_CHAT_ATTACHMENTS - selectedReferenceFiles.length - lessonCount
          }
          onError={(error) => {
            if (error.code === 'max_file_size') {
              toast.error(
                t('attachments.fileTooLarge', {
                  name: t('actionMenu.uploadFiles'),
                })
              );
              return;
            }

            toast.error(
              t('attachments.tooMany', { count: MAX_CHAT_ATTACHMENTS })
            );
          }}
          onSubmit={onPromptSubmit}
        >
          <ChatInputContent
            {...props}
            handleSubmit={handleSubmit}
            isChatting={isChatting}
            isLimitReached={isLimitReached}
            isStreaming={isStreaming}
            isUploading={isUploading}
            limitCount={limitCount}
            pickerSource={pickerSource}
            selectedAttachmentCount={selectedAttachmentCount}
            selectedReferenceFiles={selectedReferenceFiles}
            setLessonCount={setLessonCount}
            setPickerSource={setPickerSource}
            setSelectedReferenceFiles={setSelectedReferenceFiles}
            submitSnapshotRef={submitSnapshotRef}
            userMessageCount={userMessageCount}
          />
        </PromptInput>
      </div>

      {!isChatting && (footer ?? defaultFooter)}

      {isLimitReached && (
        <p className="text-center font-medium text-muted-foreground text-sm">
          {t('limitReachedHelper', {
            count: limitCount,
            used: userMessageCount,
          })}
        </p>
      )}
    </div>
  );
}

export function ChatInput(props: ChatInputProps) {
  const t = useTranslations('AIChat');
  const defaultFooter = (
    <div className="flex items-center justify-center gap-6 px-4">
      <div className="flex cursor-default items-center gap-1.5 text-muted-foreground/50 transition-colors hover:text-muted-foreground/80">
        <Button
          className="flex h-auto items-center gap-1.5 p-0 hover:bg-transparent"
          variant="ghost"
        >
          <Settings2 className="size-3.5" />
          <span className="font-medium text-[11px]">
            {t('footer.responseDisclaimer')}
          </span>
        </Button>
      </div>
      <div className="flex cursor-default items-center gap-1.5 text-muted-foreground/50 transition-colors hover:text-muted-foreground/80">
        <Button
          className="flex h-auto items-center gap-1.5 p-0 hover:bg-transparent"
          variant="ghost"
        >
          <Library className="size-3.5" />
          <span className="font-medium text-[11px]">
            {t('footer.academicDraft')}
          </span>
        </Button>
      </div>
    </div>
  );

  return (
    <PromptInputProvider>
      <ChatInputComposer {...props} defaultFooter={defaultFooter} />
    </PromptInputProvider>
  );
}
