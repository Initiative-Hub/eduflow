'use client';

import {
  ArrowUp,
  Library,
  Loader2,
  Paperclip,
  Settings2,
  Square,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type FormEvent, useState } from 'react';
import { toast } from 'sonner';
import {
  PromptInput,
  PromptInputButton,
  PromptInputFooter,
  PromptInputHeader,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
} from '@/components/ai-elements/prompt-input';
import { Button } from '@/components/ui/button';
import type { ChatModel } from '@/services/ai/chat-models';
import { ChatInputAttachments } from './chat-input-attachments';
import { ChatModelSelectControl } from './chat-model-select-control';
import { useChatInputFiles } from './use-chat-input-files';

const MAX_CHAT_ATTACHMENTS = 10;

interface ChatInputProps {
  handleSubmit: (
    e?: FormEvent,
    customValue?: string,
    files?: File[]
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
}: ChatInputProps) {
  const t = useTranslations('AIChat');
  const [inputValue, setInputValue] = useState('');
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

  const onPromptSubmit = async (message: PromptInputMessage) => {
    if (
      isStreaming ||
      isUploading ||
      isLimitReached ||
      (!message.text.trim() && selectedFiles.length === 0)
    ) {
      return;
    }

    try {
      await handleSubmit(
        undefined,
        message.text,
        selectedFiles.map((item) => item.file)
      );
      setInputValue('');
      clearSelectedFiles();
    } catch {
      // Keep the draft and attachments so the user can retry.
    }
  };

  const inputPlaceholder = isLimitReached
    ? t('limitReachedPlaceholder', { count: limitCount })
    : t('placeholder');

  return (
    <div className="space-y-4 transition-all duration-200">
      <div className="group mx-auto max-w-3xl">
        <PromptInput
          className="*:data-[slot=input-group]:rounded-4xl *:data-[slot=input-group]:border *:data-[slot=input-group]:border-border/80 *:data-[slot=input-group]:bg-background! *:data-[slot=input-group]:p-2.5 *:data-[slot=input-group]:shadow-sm *:data-[slot=input-group]:transition-all *:data-[slot=input-group]:group-focus-within:border-primary/70 *:data-[slot=input-group]:group-focus-within:shadow-md *:data-[slot=input-group]:group-focus-within:ring-4 *:data-[slot=input-group]:group-focus-within:ring-primary/10"
          maxFiles={0}
          onSubmit={onPromptSubmit}
        >
          {selectedFiles.length > 0 ? (
            <PromptInputHeader className="px-2 pt-2">
              <ChatInputAttachments
                files={selectedFiles}
                getRemoveLabel={(fileName) =>
                  t('attachments.remove', { name: fileName })
                }
                onRemove={removeSelectedFile}
              />
            </PromptInputHeader>
          ) : null}
          <PromptInputTextarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={inputPlaceholder}
            className="min-h-12 px-2 py-3 text-lg leading-normal placeholder:text-foreground"
            disabled={isLimitReached}
          />

          <PromptInputFooter className="flex items-center justify-between gap-2 px-1 pb-1">
            <div className="flex items-center gap-2">
              {isAuthenticated ? (
                <>
                  <input
                    className="hidden"
                    disabled={isStreaming || isUploading || isLimitReached}
                    multiple
                    onChange={handleFileInputChange}
                    ref={fileInputRef}
                    type="file"
                  />
                  <PromptInputButton
                    aria-label={t('attachments.add')}
                    className="size-9 cursor-pointer rounded-full text-foreground transition-colors hover:bg-muted-foreground/30"
                    disabled={isStreaming || isUploading || isLimitReached}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip className="size-5" />
                  </PromptInputButton>
                </>
              ) : null}
              {selectedModel && onModelChange ? (
                <ChatModelSelectControl
                  disabled={isStreaming || isUploading}
                  emptyLabel={t('modelSelector.empty')}
                  heading={t('modelSelector.heading')}
                  label={t('modelSelector.label')}
                  onModelChange={onModelChange}
                  selectedModel={selectedModel}
                />
              ) : null}
            </div>

            <PromptInputSubmit
              className="size-9 cursor-pointer rounded-full transition-all hover:scale-105"
              disabled={
                isLimitReached ||
                isUploading ||
                (!isStreaming &&
                  !inputValue.trim() &&
                  selectedFiles.length === 0)
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

      {!isChatting && (
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
      )}

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
