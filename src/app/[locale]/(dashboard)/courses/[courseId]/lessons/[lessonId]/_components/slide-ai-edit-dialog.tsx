'use client';

import { ImageIcon, Loader2, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { DialogTemplate } from '@/components/custom/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { SlideAiDialogScope } from './use-slide-ai-edit';

interface SlideAiEditDialogProps {
  isOpen: boolean;
  scope: SlideAiDialogScope | null;
  previewText?: string;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (instruction: string) => void;
}

export function SlideAiEditDialog({
  isOpen,
  scope,
  previewText,
  isPending,
  onOpenChange,
  onSubmit,
}: SlideAiEditDialogProps) {
  const t = useTranslations('Courses.LessonPresentation');
  const [instruction, setInstruction] = useState('');

  useEffect(() => {
    if (isOpen) setInstruction('');
  }, [isOpen, scope]);

  const trimmedInstruction = instruction.trim();
  const isElementEdit = scope === 'element';
  const isImageEdit = scope === 'image';
  const title = isImageEdit
    ? t('aiImageTitle')
    : isElementEdit
      ? t('aiTextTitle')
      : t('aiSlideTitle');
  const description = isImageEdit
    ? t('aiImageDescription')
    : isElementEdit
      ? t('aiTextDescription')
      : t('aiSlideDescription');
  const placeholder = isImageEdit
    ? t('aiImagePlaceholder')
    : isElementEdit
      ? t('aiTextPlaceholder')
      : t('aiSlidePlaceholder');

  const handleSubmit = () => {
    if (trimmedInstruction.length < 2 || isPending) return;
    onSubmit(trimmedInstruction);
  };

  return (
    <DialogTemplate
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      className="sm:max-w-lg"
      footer={
        <>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            {t('aiCancel')}
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={trimmedInstruction.length < 2 || isPending}
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : isImageEdit ? (
              <ImageIcon className="mr-2 h-4 w-4" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            {isPending
              ? isImageEdit
                ? t('aiImageGenerating')
                : t('aiEditing')
              : isImageEdit
                ? t('aiGenerateImage')
                : t('aiApplyEdit')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {isElementEdit && previewText ? (
          <div className="rounded-lg border border-border bg-muted/50 p-3">
            <p className="mb-1 font-medium text-muted-foreground text-xs uppercase tracking-wide">
              {t('aiSelectedText')}
            </p>
            <p className="line-clamp-3 text-foreground text-sm">
              {previewText}
            </p>
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="slide-ai-edit-instruction">
            {isImageEdit ? t('aiImagePromptLabel') : t('aiInstructionLabel')}
          </Label>
          <Textarea
            id="slide-ai-edit-instruction"
            value={instruction}
            onChange={(event) => setInstruction(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                event.preventDefault();
                handleSubmit();
              }
            }}
            rows={4}
            maxLength={isImageEdit ? 2000 : 1000}
            autoFocus
            placeholder={placeholder}
          />
          <p className="text-muted-foreground text-xs">
            {isImageEdit ? t('aiImageHint') : t('aiLengthHint')}
          </p>
        </div>
      </div>
    </DialogTemplate>
  );
}
