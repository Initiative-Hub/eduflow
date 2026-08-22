'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  QUIZ_CATEGORIES,
  type QuestionSubType,
  type QuizCategory,
} from '@/lib/quiz-template';

interface QuizAiDraftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isGenerating: boolean;
  resetKey?: number;
  onSubmit: (data: {
    questionCounts: Partial<Record<QuestionSubType, number>>;
    context?: string;
  }) => void;
}

export function QuizAiDraftDialog({
  open,
  onOpenChange,
  isGenerating,
  resetKey,
  onSubmit,
}: QuizAiDraftDialogProps) {
  const t = useTranslations('Courses.CreateQuiz');
  const tQuizPlayer = useTranslations('Courses.QuizPlayer');
  const [category, setCategory] = useState<QuizCategory | ''>('');
  const [counts, setCounts] = useState<
    Partial<Record<QuestionSubType, string>>
  >({});
  const [context, setContext] = useState('');
  const availableTypes = category ? QUIZ_CATEGORIES[category].subTypes : [];
  const total = Object.values(counts).reduce(
    (sum, value) => sum + (Number.parseInt(value ?? '', 10) || 0),
    0
  );

  const resetForm = useCallback(() => {
    setCategory('');
    setCounts({});
    setContext('');
  }, []);

  useEffect(() => {
    if (resetKey === undefined) return;
    resetForm();
  }, [resetForm, resetKey]);

  const handleSubmit = () => {
    if (!category || total < 1) return;
    onSubmit({
      questionCounts: Object.entries(counts).reduce<
        Partial<Record<QuestionSubType, number>>
      >((result, [type, value]) => {
        const count = Number.parseInt(value ?? '', 10) || 0;
        if (count > 0) result[type as QuestionSubType] = count;
        return result;
      }, {}),
      context: context.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t('aiGenerate')}</DialogTitle>
          <DialogDescription>{t('aiGenerateDescription')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label htmlFor="draft-ai-category">{t('category')}</Label>
            <Select
              value={category}
              onValueChange={(value) => {
                setCategory(value as QuizCategory);
                setCounts({});
              }}
            >
              <SelectTrigger id="draft-ai-category" className="min-h-11">
                <SelectValue placeholder={t('categoryPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(QUIZ_CATEGORIES).map((value) => (
                  <SelectItem key={value} value={value}>
                    {t(`categories.${value}.label`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {availableTypes.length > 0 ? (
            <fieldset className="space-y-3">
              <legend className="font-medium text-sm">
                {t('questionDistribution')}
              </legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {availableTypes.map((type) => (
                  <div key={type} className="space-y-1.5">
                    <Label htmlFor={`draft-count-${type}`}>
                      {t(`questionTypes.${type}`)}
                    </Label>
                    <Input
                      id={`draft-count-${type}`}
                      type="number"
                      min="0"
                      max="50"
                      inputMode="numeric"
                      value={counts[type] ?? ''}
                      onChange={(event) =>
                        setCounts((current) => ({
                          ...current,
                          [type]: event.target.value,
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
            </fieldset>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="draft-ai-context">
              {tQuizPlayer('aiContextLabel')}
            </Label>
            <Textarea
              id="draft-ai-context"
              value={context}
              onChange={(event) => setContext(event.target.value)}
              maxLength={500}
              rows={3}
              placeholder={tQuizPlayer('aiContextPlaceholder')}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
          >
            {t('cancel')}
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!category || total < 1 || isGenerating}
          >
            {isGenerating ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : null}
            {isGenerating ? t('generatingQuestions') : t('generate')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
