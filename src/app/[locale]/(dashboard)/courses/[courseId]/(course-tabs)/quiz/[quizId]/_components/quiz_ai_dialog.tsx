'use client';

import { Loader2, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const MAX_CONTEXT_LENGTH = 500;

interface QuizAiDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (context: string) => void;
  isGenerating: boolean;
}

export default function QuizAiDialog({
  open,
  onOpenChange,
  onSubmit,
  isGenerating,
}: QuizAiDialogProps) {
  const t = useTranslations('Courses.QuizPlayer');
  const [context, setContext] = useState('');

  useEffect(() => {
    if (!open) {
      setContext('');
    }
  }, [open]);

  const handleSubmit = () => {
    onSubmit(context.trim());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('aiContextDialogTitle')}</DialogTitle>
          <DialogDescription>
            {t('aiContextDialogDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="quiz-ai-context">{t('aiContextLabel')}</Label>
          <Textarea
            id="quiz-ai-context"
            value={context}
            onChange={(event) => setContext(event.target.value)}
            maxLength={MAX_CONTEXT_LENGTH}
            placeholder={t('aiContextPlaceholder')}
            className="min-h-32"
          />
          <p className="text-muted-foreground text-xs">
            {t('aiContextCharacters', {
              current: context.length,
              max: MAX_CONTEXT_LENGTH,
            })}
          </p>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
          >
            {t('aiContextCancel')}
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isGenerating}>
            {isGenerating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            {t('aiContextSubmit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
