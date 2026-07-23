'use client';

import { useCurrentEditor, useEditorState } from '@tiptap/react';
import { Check, Sparkles, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
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
  type LessonAiProposal,
  prepareAiEdit,
  resolveAiEdit,
} from '@/lib/lesson-ai-edit';
import {
  clearLessonAiReview,
  clearLessonAiReviewTransaction,
  showLessonAiReview,
} from '@/lib/lesson-ai-review';

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
  const abortControllerRef = useRef<AbortController | null>(null);
  const candidateTransactionRef = useRef<ReturnType<
    typeof resolveAiEdit
  > | null>(null);
  const editableBeforeReviewRef = useRef<boolean | null>(null);
  const requestIdRef = useRef(0);

  const restoreEditorAfterReview = () => {
    if (!editor) return;

    clearLessonAiReview(editor);
    if (editableBeforeReviewRef.current !== null) {
      editor.setEditable(editableBeforeReviewRef.current);
      editableBeforeReviewRef.current = null;
    }
  };

  const clearReview = () => {
    candidateTransactionRef.current = null;
    restoreEditorAfterReview();
  };

  const cancelRequest = () => {
    requestIdRef.current += 1;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
  };

  const reset = () => {
    cancelRequest();
    clearReview();
    setDraft('');
    setInstruction('');
    setIsLoading(false);
    setProposal(null);
  };

  useEffect(
    () => () => {
      cancelRequest();
      clearReview();
    },
    [editor]
  );

  const generate = async () => {
    if (!editor) return;

    let nextProposal: LessonAiProposal;
    let requestBody: ReturnType<typeof prepareAiEdit>['request'];
    try {
      const preparedEdit = prepareAiEdit(editor, instruction);
      nextProposal = preparedEdit.proposal;
      requestBody = preparedEdit.request;
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Unable to prepare the selection.'
      );
      return;
    }

    const requestId = requestIdRef.current + 1;
    const abortController = new AbortController();
    requestIdRef.current = requestId;
    abortControllerRef.current = abortController;
    setIsLoading(true);
    setDraft('');
    setProposal(nextProposal);

    try {
      const response = await fetch('/api/v1/ai/lesson-editor', {
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
        signal: abortController.signal,
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
        if (requestIdRef.current === requestId) setDraft(output);
      }

      output += decoder.decode();
      if (requestIdRef.current !== requestId) return;

      const candidate = resolveAiEdit(editor, nextProposal, output);
      showLessonAiReview(editor, nextProposal, candidate);
      candidateTransactionRef.current = candidate;
      editableBeforeReviewRef.current = editor.isEditable;
      editor.setEditable(false);
      setDraft(output);
    } catch (error) {
      if (abortController.signal.aborted) return;
      setProposal(null);
      toast.error(
        error instanceof Error ? error.message : 'AI editing failed.'
      );
    } finally {
      if (requestIdRef.current === requestId) {
        abortControllerRef.current = null;
        setIsLoading(false);
      }
    }
  };

  const accept = () => {
    const candidate = candidateTransactionRef.current;
    if (!editor || !proposal || !draft || !candidate) return;

    try {
      editor.view.dispatch(
        clearLessonAiReviewTransaction(editor, candidate).scrollIntoView()
      );
      candidateTransactionRef.current = null;
      if (editableBeforeReviewRef.current !== null) {
        editor.setEditable(editableBeforeReviewRef.current);
        editableBeforeReviewRef.current = null;
      }
      setIsOpen(false);
      setDraft('');
      setInstruction('');
      setProposal(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Unable to apply the AI edit.'
      );
    }
  };

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
            {!isLoading && draft ? (
              <p className="text-muted-foreground text-sm" role="status">
                {t('reviewInEditor')}
              </p>
            ) : null}
            {!isLoading ? (
              <div className="flex justify-end gap-2">
                <Button
                  onClick={() => {
                    reset();
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
