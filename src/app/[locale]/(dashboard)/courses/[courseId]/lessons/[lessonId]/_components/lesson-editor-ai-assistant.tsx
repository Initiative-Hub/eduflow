'use client';

import { useCurrentEditor, useEditorState } from '@tiptap/react';
import { Check, Sparkles, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button as TiptapButton } from '@/components/tiptap-ui-primitive/button';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import {
  createLessonAiProposal,
  createLessonAiTransaction,
  type LessonAiProposal,
} from '@/lib/lesson-ai-edit';

function getTextDiff(before: string, after: string) {
  let prefix = 0;
  while (prefix < before.length && before[prefix] === after[prefix])
    prefix += 1;

  let suffix = 0;
  while (
    suffix < before.length - prefix &&
    suffix < after.length - prefix &&
    before[before.length - suffix - 1] === after[after.length - suffix - 1]
  ) {
    suffix += 1;
  }

  return {
    added: after.slice(prefix, after.length - suffix),
    prefix: before.slice(0, prefix),
    removed: before.slice(prefix, before.length - suffix),
    suffix: before.slice(before.length - suffix),
  };
}

export function LessonEditorAiAssistant() {
  const t = useTranslations('Courses.LessonEditor.aiAssistant');
  const { editor } = useCurrentEditor();
  const selectionEmpty =
    useEditorState({
      editor,
      selector: (snapshot) => snapshot.editor?.state.selection.empty ?? true,
    }) ?? true;
  const [draft, setDraft] = useState('');
  const [instruction, setInstruction] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [proposal, setProposal] = useState<LessonAiProposal | null>(null);

  const reset = () => {
    setDraft('');
    setInstruction('');
    setIsLoading(false);
    setProposal(null);
  };

  const generate = async () => {
    if (!editor) return;

    let nextProposal: LessonAiProposal;
    try {
      nextProposal = createLessonAiProposal(editor);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Unable to prepare the selection.'
      );
      return;
    }

    setIsLoading(true);
    setDraft('');
    setProposal(nextProposal);

    try {
      const response = await fetch('/api/v1/ai/lesson-editor', {
        body: JSON.stringify({
          beforeText: nextProposal.beforeText,
          html: nextProposal.html,
          instruction,
          selectionText: nextProposal.selectionText,
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      if (!response.ok || !response.body) {
        throw new Error(
          (await response.json().catch(() => null))?.message ||
            'AI editing failed.'
        );
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let output = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        output += decoder.decode(value, { stream: true });
        setDraft(output);
      }

      output += decoder.decode();
      setDraft(output);
      createLessonAiTransaction(editor, nextProposal, output);
    } catch (error) {
      setProposal(null);
      toast.error(
        error instanceof Error ? error.message : 'AI editing failed.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const accept = () => {
    if (!editor || !proposal || !draft) return;

    try {
      editor.view.dispatch(
        createLessonAiTransaction(editor, proposal, draft).scrollIntoView()
      );
      setIsOpen(false);
      reset();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Unable to apply the AI edit.'
      );
    }
  };

  const diff =
    proposal && draft
      ? getTextDiff(proposal.beforeText, draft.replace(/<[^>]+>/g, ' '))
      : null;
  const disabled = !editor || selectionEmpty;

  return (
    <Popover
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) reset();
      }}
      open={isOpen}
    >
      <PopoverTrigger asChild>
        <TiptapButton
          aria-label={t('ariaLabel')}
          disabled={disabled}
          showTooltip={false}
          title={disabled ? t('tooltipDisabled') : t('tooltip')}
          type="button"
        >
          <Sparkles className="tiptap-button-icon" />
        </TiptapButton>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-96 p-3">
        <PopoverHeader>
          <PopoverTitle>{t('title')}</PopoverTitle>
          <PopoverDescription>{t('description')}</PopoverDescription>
        </PopoverHeader>

        {!proposal ? (
          <>
            <Textarea
              aria-label={t('promptLabel')}
              disabled={isLoading}
              onChange={(event) => setInstruction(event.target.value)}
              placeholder={t('placeholder')}
              value={instruction}
            />
            <Button
              disabled={!instruction.trim() || isLoading}
              onClick={generate}
              size="sm"
            >
              {isLoading ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <Sparkles data-icon="inline-start" />
              )}
              {t('generate')}
            </Button>
          </>
        ) : (
          <div className="flex flex-col gap-3">
            {isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Spinner /> {t('generating')}
              </div>
            ) : null}
            {diff ? (
              <div
                aria-label={t('proposedChanges')}
                className="max-h-52 overflow-y-auto rounded-md border bg-muted/30 p-2 text-sm leading-6"
                role="region"
              >
                <span>{diff.prefix}</span>
                {diff.removed ? (
                  <del className="bg-destructive/15 text-destructive">
                    {diff.removed}
                  </del>
                ) : null}
                {diff.added ? (
                  <ins className="bg-primary/15 text-primary no-underline">
                    {diff.added}
                  </ins>
                ) : null}
                <span>{diff.suffix}</span>
              </div>
            ) : null}
            {!isLoading ? (
              <div className="flex justify-end gap-2">
                <Button
                  onClick={() => {
                    setProposal(null);
                    setDraft('');
                  }}
                  size="sm"
                  variant="outline"
                >
                  <X data-icon="inline-start" /> {t('reject')}
                </Button>
                <Button disabled={!draft} onClick={accept} size="sm">
                  <Check data-icon="inline-start" /> {t('accept')}
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
