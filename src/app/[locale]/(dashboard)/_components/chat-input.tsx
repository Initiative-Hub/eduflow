'use client';

import { ArrowUp, Library, Paperclip, Settings2, Square } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  ModelSelectorName,
  ModelSelectorTrigger,
} from '@/components/ai-elements/model-selector';
import {
  PromptInput,
  PromptInputButton,
  PromptInputFooter,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
} from '@/components/ai-elements/prompt-input';
import { Button } from '@/components/ui/button';
import { CHAT_MODEL_OPTIONS, type ChatModel } from '@/services/ai/chat-models';

interface ChatInputProps {
  handleSubmit: (e?: React.FormEvent, customValue?: string) => void;
  isStreaming: boolean;
  isChatting: boolean;
  isLimitReached: boolean;
  limitCount: number;
  userMessageCount: number;
  onStop: () => void;
  selectedModel?: ChatModel;
  onModelChange?: (model: ChatModel) => void;
}

export function ChatInput({
  handleSubmit,
  isStreaming,
  isChatting,
  isLimitReached,
  limitCount,
  userMessageCount,
  onStop,
  selectedModel,
  onModelChange,
}: ChatInputProps) {
  const t = useTranslations('AIChat');
  const [inputValue, setInputValue] = useState('');
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  const selectedModelLabel =
    CHAT_MODEL_OPTIONS.find((model) => model.id === selectedModel)?.label ?? '';

  const onPromptSubmit = (message: PromptInputMessage) => {
    if (isStreaming || isLimitReached || !message.text.trim()) return;
    handleSubmit(undefined, message.text);
    setInputValue('');
  };

  const inputPlaceholder = isLimitReached
    ? t('limitReachedPlaceholder', { count: limitCount })
    : t('placeholder');

  return (
    <div
      className={`relative w-full space-y-4 transition-all duration-200 ${isChatting ? 'mt-auto' : ''}`}
    >
      <div className="group relative mx-auto max-w-3xl">
        <div className="absolute inset-x-0 -top-px -bottom-px rounded-[2rem] bg-linear-to-r from-transparent via-primary/50 to-transparent opacity-0 transition-opacity duration-500 group-focus-within:opacity-100" />

        <PromptInput
          className="relative *:data-[slot=input-group]:rounded-[2rem] *:data-[slot=input-group]:border-border *:data-[slot=input-group]:bg-white *:data-[slot=input-group]:p-2 *:data-[slot=input-group]:shadow-xl *:data-[slot=input-group]:transition-all *:data-[slot=input-group]:group-focus-within:border-primary/30 *:data-[slot=input-group]:group-focus-within:shadow-2xl dark:*:data-[slot=input-group]:bg-zinc-950"
          onSubmit={onPromptSubmit}
        >
          <PromptInputTextarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={inputPlaceholder}
            className="min-h-12 px-2 py-3 text-lg leading-normal placeholder:text-muted-foreground/50"
            disabled={isLimitReached}
          />

          <PromptInputFooter className="flex items-center justify-between gap-2 px-1 pb-1">
            <div className="flex items-center gap-2">
              <PromptInputButton className="size-9 rounded-full text-muted-foreground transition-colors hover:bg-primary/5 hover:text-primary">
                <Paperclip className="size-5" />
              </PromptInputButton>
              {selectedModel && onModelChange ? (
                <ModelSelector
                  onOpenChange={setIsModelSelectorOpen}
                  open={isModelSelectorOpen && !isStreaming}
                >
                  <ModelSelectorTrigger asChild>
                    <Button
                      aria-label={t('modelSelector.label')}
                      className="h-8 gap-2 rounded-full border-none px-3 text-muted-foreground text-sm hover:bg-muted/70"
                      disabled={isStreaming}
                      type="button"
                      variant="outline"
                    >
                      <ModelSelectorLogo provider="google" />
                      <ModelSelectorName>
                        {selectedModelLabel}
                      </ModelSelectorName>
                    </Button>
                  </ModelSelectorTrigger>
                  <ModelSelectorContent>
                    <ModelSelectorList>
                      <ModelSelectorEmpty>
                        {t('modelSelector.empty')}
                      </ModelSelectorEmpty>
                      <ModelSelectorGroup heading="Choose Model">
                        {CHAT_MODEL_OPTIONS.map((model) => (
                          <ModelSelectorItem
                            data-checked={model.id === selectedModel}
                            key={model.id}
                            onSelect={() => {
                              onModelChange(model.id);
                              setIsModelSelectorOpen(false);
                            }}
                            value={model.label}
                          >
                            <ModelSelectorLogo provider="google" />
                            <ModelSelectorName>{model.label}</ModelSelectorName>
                          </ModelSelectorItem>
                        ))}
                      </ModelSelectorGroup>
                    </ModelSelectorList>
                  </ModelSelectorContent>
                </ModelSelector>
              ) : null}
            </div>

            <PromptInputSubmit
              className="size-9 rounded-full transition-all hover:scale-105"
              disabled={isLimitReached || (!isStreaming && !inputValue.trim())}
              onStop={onStop}
              status={isStreaming ? 'streaming' : 'ready'}
              variant={isStreaming ? 'destructive' : 'default'}
            >
              {isStreaming ? (
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
