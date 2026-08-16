'use client';

import { useMutation } from '@tanstack/react-query';
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
import { type FormEvent, type ReactNode, useCallback, useState } from 'react';
import { toast } from 'sonner';
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputHeader,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from '@/components/ai-elements/prompt-input';
import { DropdownTemplate, type MenuItem } from '@/components/custom/dropdown';
import { GoogleDrivePickerHost } from '@/components/google-drive-picker/google-drive-picker-host';
import { Button } from '@/components/ui/button';
import { useGoogleDrivePicker } from '@/hooks/use-google-drive-picker';
import type { ChatModel } from '@/services/ai/chat-provider.constants';
import type {
  ChatFileUIPart,
  ChatSubmitAttachments,
} from '@/types/chat-attachments';
import type { ChatLessonReferenceUIPart } from '@/types/chat-lesson-references';
import { inventoryService } from '../../inventory/inventory.service';
import type { InventoryEntry } from '../../inventory/inventory.types';
import {
  ChatInputAttachments,
  type SelectedChatFile,
} from './chat-input-attachments';
import { ChatInventoryAttachmentDialog } from './chat-inventory-attachment-dialog';
import { ChatModelSelectControl } from './chat-model-select-control';
import { useChatInputFiles } from './use-chat-input-files';

const MAX_CHAT_ATTACHMENTS = 10;
const DEFAULT_MEDIA_TYPE = 'application/octet-stream';

function toChatFilePart({
  entry,
  signedUrl,
}: {
  entry: InventoryEntry;
  signedUrl: string;
}): ChatFileUIPart {
  return {
    bucket: entry.bucket,
    courseId: null,
    fileId: entry.id,
    fileSize: entry.fileSize,
    filename: entry.name,
    mediaType: entry.mimeType ?? DEFAULT_MEDIA_TYPE,
    objectKey: entry.objectKey,
    source: 'personal',
    type: 'file',
    url: signedUrl,
  };
}

export type ChatInputToolsContext = {
  disabled: boolean;
  disabledLessonIds: string[];
  maxSelectable: number;
  onAttachLessonReferences: (lessons: ChatLessonReferenceUIPart[]) => void;
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

export function ChatInput({
  handleSubmit,
  isStreaming,
  isUploading,
  isChatting,
  isLimitReached,
  isAuthenticated,
  limitCount,
  userMessageCount,
  onStop,
  selectedModel,
  onModelChange,
  placeholder,
  tools,
  footer,
}: ChatInputProps) {
  const t = useTranslations('AIChat');
  const [inputValue, setInputValue] = useState('');
  const [pickerSource, setPickerSource] = useState<
    'personal' | 'course' | null
  >(null);
  const [selectedReferenceFiles, setSelectedReferenceFiles] = useState<
    SelectedChatFile[]
  >([]);
  const [selectedReferenceLessons, setSelectedReferenceLessons] = useState<
    SelectedChatFile[]
  >([]);
  const {
    clearSelectedFiles,
    fileInputRef,
    handleFileInputChange,
    removeSelectedFile,
    selectedFiles,
  } = useChatInputFiles({
    isAuthenticated,
    maxFiles: MAX_CHAT_ATTACHMENTS,
    onFileTooLarge: (fileName) =>
      toast.error(t('attachments.fileTooLarge', { name: fileName })),
    onTooMany: () =>
      toast.error(t('attachments.tooMany', { count: MAX_CHAT_ATTACHMENTS })),
  });
  const selectedAttachments = [
    ...selectedFiles,
    ...selectedReferenceFiles,
    ...selectedReferenceLessons,
  ];
  const remainingAttachmentSlots = Math.max(
    0,
    MAX_CHAT_ATTACHMENTS - selectedAttachments.length
  );

  const onPromptSubmit = async (message: PromptInputMessage) => {
    if (
      isStreaming ||
      isUploading ||
      googleDriveImportMutation.isPending ||
      isLimitReached ||
      (!message.text.trim() && selectedAttachments.length === 0)
    ) {
      return;
    }

    try {
      await handleSubmit(undefined, message.text, {
        files: selectedFiles.flatMap((item) => (item.file ? [item.file] : [])),
        referencedFiles: selectedReferenceFiles.flatMap((item) =>
          item.filePart ? [item.filePart] : []
        ),
        referencedLessons: selectedReferenceLessons.flatMap((item) =>
          item.lessonPart ? [item.lessonPart] : []
        ),
      });
      setInputValue('');
      clearSelectedFiles();
      setSelectedReferenceFiles([]);
      setSelectedReferenceLessons([]);
    } catch {
      // Keep the draft and attachments so the user can retry.
    }
  };
  const removeSelectedAttachment = (fileId: string) => {
    removeSelectedFile(fileId);
    setSelectedReferenceFiles((current) =>
      current.filter((item) => item.id !== fileId)
    );
    setSelectedReferenceLessons((current) =>
      current.filter((item) => item.id !== fileId)
    );
  };
  const addReferenceFiles = (files: ChatFileUIPart[]) => {
    if (files.length === 0) return;

    setSelectedReferenceFiles((current) => {
      const existingIds = new Set([
        ...selectedFiles.map((item) => item.filePart?.fileId ?? item.id),
        ...current.map((item) => item.filePart?.fileId ?? item.id),
      ]);
      const capacity = Math.max(
        0,
        MAX_CHAT_ATTACHMENTS -
          selectedFiles.length -
          selectedReferenceLessons.length -
          current.length
      );
      const accepted = files
        .filter((file) => !existingIds.has(file.fileId))
        .slice(0, capacity)
        .map((file) => ({
          filePart: file,
          filename: file.filename ?? file.fileId,
          id: file.fileId,
          mediaType: file.mediaType,
          previewUrl: file.url,
        }));

      if (files.length > accepted.length) {
        toast.error(t('attachments.tooMany', { count: MAX_CHAT_ATTACHMENTS }));
      }

      return [...current, ...accepted];
    });
  };
  const addReferenceLessons = (lessons: ChatLessonReferenceUIPart[]) => {
    if (lessons.length === 0) return;

    setSelectedReferenceLessons((current) => {
      const existingIds = new Set([
        ...current.map((item) => item.lessonPart?.data.lessonId ?? item.id),
      ]);
      const capacity = Math.max(
        0,
        MAX_CHAT_ATTACHMENTS -
          selectedFiles.length -
          selectedReferenceFiles.length -
          current.length
      );
      const accepted = lessons
        .filter((lesson) => !existingIds.has(lesson.data.lessonId))
        .slice(0, capacity)
        .map((lesson) => ({
          filename: lesson.data.lessonTitle,
          id: lesson.data.lessonId,
          kind: 'lesson' as const,
          lessonPart: lesson,
          mediaType: 'application/x-eduflow-lesson-reference',
          previewUrl: `lesson:${lesson.data.lessonId}`,
        }));

      if (lessons.length > accepted.length) {
        toast.error(t('attachments.tooMany', { count: MAX_CHAT_ATTACHMENTS }));
      }

      return [...current, ...accepted];
    });
  };
  const openInventoryPicker = (source: 'personal' | 'course') => {
    if (remainingAttachmentSlots === 0) {
      toast.error(t('attachments.tooMany', { count: MAX_CHAT_ATTACHMENTS }));
      return;
    }

    setPickerSource(source);
  };
  const googleDriveImportMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const importResponse = await inventoryService.importFromGoogleDrive({
        fileId,
      });
      const entry = importResponse.data;
      const shareResponse = await inventoryService.shareEntry(entry.id);

      return toChatFilePart({
        entry,
        signedUrl: shareResponse.data.signedUrl,
      });
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message ?? t('attachments.uploadError'));
    },
    onSuccess: (file) => {
      addReferenceFiles([file]);
    },
  });
  const handleGoogleDrivePickerError = useCallback((message: string) => {
    toast.error(message);
  }, []);
  const handleGoogleDrivePicked = useCallback(
    (fileIds: string[]) => {
      if (remainingAttachmentSlots === 0) {
        toast.error(t('attachments.tooMany', { count: MAX_CHAT_ATTACHMENTS }));
        return;
      }

      const [fileId] = fileIds;
      if (!fileId) return;

      googleDriveImportMutation.mutate(fileId);
    },
    [googleDriveImportMutation, remainingAttachmentSlots, t]
  );
  const googleDrivePicker = useGoogleDrivePicker({
    messages: {
      connectRequired: t('attachments.googleDriveConnectRequired'),
      notConfigured: t('attachments.googleDriveUnavailable'),
      sessionChanged: t('attachments.googleDriveSessionChanged'),
      tokenFailed: t('attachments.googleDriveTokenFailed'),
      unavailable: t('attachments.googleDrivePickerUnavailable'),
    },
    onError: handleGoogleDrivePickerError,
    onPicked: handleGoogleDrivePicked,
  });
  const openGoogleDrivePicker = () => {
    if (remainingAttachmentSlots === 0) {
      toast.error(t('attachments.tooMany', { count: MAX_CHAT_ATTACHMENTS }));
      return;
    }

    if (!googleDrivePicker.isConfigured) {
      toast.error(t('attachments.googleDriveUnavailable'));
      return;
    }

    googleDrivePicker.openPicker();
  };

  const disabledLessonIds = selectedReferenceLessons.flatMap((item) =>
    item.lessonPart ? [item.lessonPart.data.lessonId] : []
  );
  const renderedTools =
    typeof tools === 'function'
      ? tools({
          disabled: isStreaming || isUploading || isLimitReached,
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
          label: t('actionMenu.fromGoogleDrive'),
          icon:
            googleDriveImportMutation.isPending ||
            googleDrivePicker.isLoading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Cloud />
            ),
          onClick: openGoogleDrivePicker,
        },
        {
          label: t('actionMenu.fromDevice'),
          icon: <HardDrive />,
          onClick: () => fileInputRef.current?.click(),
        },
      ],
    },
  ];
  const defaultFooter = (
    <div className="flex items-center justify-center gap-6 px-4">
      <div className="flex cursor-default items-center gap-1.5 text-muted-foreground/50 transition-colors hover:text-muted-foreground/80">
        <Button
          variant="ghost"
          className="flex h-auto items-center gap-1.5 p-0 hover:bg-transparent"
        >
          <Settings2 className="size-3.5" />
          <span className="font-medium text-[11px]">
            {t('footer.responseDisclaimer')}
          </span>
        </Button>
      </div>
      <div className="flex cursor-default items-center gap-1.5 text-muted-foreground/50 transition-colors hover:text-muted-foreground/80">
        <Button
          variant="ghost"
          className="flex h-auto items-center gap-1.5 p-0 hover:bg-transparent"
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
    <div className="space-y-4 transition-all duration-200">
      {googleDrivePicker.pickerProps && (
        <GoogleDrivePickerHost {...googleDrivePicker.pickerProps} />
      )}
      <div className="group mx-auto max-w-3xl">
        <input
          aria-label={t('actionMenu.uploadFiles')}
          className="hidden"
          disabled={isStreaming || isUploading || isLimitReached}
          multiple
          onChange={handleFileInputChange}
          ref={fileInputRef}
          title={t('actionMenu.uploadFiles')}
          type="file"
        />
        <PromptInput
          className="*:data-[slot=input-group]:rounded-4xl *:data-[slot=input-group]:border *:data-[slot=input-group]:border-border/80 *:data-[slot=input-group]:bg-white *:data-[slot=input-group]:px-2.5 *:data-[slot=input-group]:py-2 *:data-[slot=input-group]:shadow-sm *:data-[slot=input-group]:transition-all *:data-[slot=input-group]:group-focus-within:border-primary/70 *:data-[slot=input-group]:group-focus-within:shadow-md *:data-[slot=input-group]:group-focus-within:ring-4 *:data-[slot=input-group]:group-focus-within:ring-primary/10 dark:*:data-[slot=input-group]:bg-zinc-950"
          maxFiles={0}
          onSubmit={onPromptSubmit}
        >
          {selectedAttachments.length > 0 && (
            <PromptInputHeader>
              <ChatInputAttachments
                files={selectedAttachments}
                getRemoveLabel={(fileName) =>
                  t('attachments.remove', { name: fileName })
                }
                onRemove={removeSelectedAttachment}
              />
            </PromptInputHeader>
          )}

          <PromptInputBody>
            <PromptInputTextarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={placeholder ?? t('placeholder')}
              className="min-h-11 px-2 py-2.5 text-base leading-normal placeholder:text-foreground sm:text-lg"
              disabled={isLimitReached}
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
                googleDriveImportMutation.isPending ||
                (!isStreaming &&
                  !inputValue.trim() &&
                  selectedAttachments.length === 0)
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

      <ChatInventoryAttachmentDialog
        disabledFileIds={selectedReferenceFiles.flatMap((item) =>
          item.filePart ? [item.filePart.fileId] : []
        )}
        maxSelectable={remainingAttachmentSlots}
        onAttach={addReferenceFiles}
        onOpenChange={(open) => setPickerSource(open ? pickerSource : null)}
        open={pickerSource === 'personal'}
        source="personal"
      />
      <ChatInventoryAttachmentDialog
        disabledFileIds={selectedReferenceFiles.flatMap((item) =>
          item.filePart ? [item.filePart.fileId] : []
        )}
        maxSelectable={remainingAttachmentSlots}
        onAttach={addReferenceFiles}
        onOpenChange={(open) => setPickerSource(open ? pickerSource : null)}
        open={pickerSource === 'course'}
        source="course"
      />
    </div>
  );
}
