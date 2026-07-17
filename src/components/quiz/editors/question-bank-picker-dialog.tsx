'use client';

import { Check, Library } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
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
import type { QuestionBankEntry } from '@/lib/quiz-template';
import { cn } from '@/lib/utils';

interface QuestionBankPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questions: QuestionBankEntry[];
  selectedQuestionIds: Array<string | null>;
  onAdd: (questions: QuestionBankEntry[]) => void;
}

export function QuestionBankPickerDialog({
  open,
  onOpenChange,
  questions,
  selectedQuestionIds,
  onAdd,
}: QuestionBankPickerDialogProps) {
  const t = useTranslations('Courses.QuizPlayer');
  const [query, setQuery] = useState('');
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set());
  const selectedIds = useMemo(
    () => new Set(selectedQuestionIds.filter((id): id is string => !!id)),
    [selectedQuestionIds]
  );
  const visibleQuestions = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return normalizedQuery
      ? questions.filter((question) =>
          question.prompt.toLocaleLowerCase().includes(normalizedQuery)
        )
      : questions;
  }, [query, questions]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setQuery('');
      setPendingIds(new Set());
    }
    onOpenChange(nextOpen);
  };

  const handleAdd = () => {
    const questionsById = new Map(
      questions.map((question) => [question.id, question])
    );
    onAdd(
      [...pendingIds].flatMap((questionId) => {
        const question = questionsById.get(questionId);
        return question ? [question] : [];
      })
    );
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('questionBankPickerTitle')}</DialogTitle>
          <DialogDescription>
            {t('questionBankPickerDescription')}
          </DialogDescription>
        </DialogHeader>
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('questionBankSearch')}
        />
        <div className="min-h-48 flex-1 space-y-2 overflow-y-auto py-1">
          {visibleQuestions.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center text-center text-muted-foreground">
              <Library className="mb-2 h-8 w-8" />
              <p className="text-sm">{t('questionBankEmpty')}</p>
            </div>
          ) : (
            visibleQuestions.map((question) => {
              const alreadySelected = selectedIds.has(question.id);
              const isPending = pendingIds.has(question.id);
              return (
                <button
                  key={question.id}
                  type="button"
                  disabled={alreadySelected}
                  onClick={() =>
                    setPendingIds((current) => {
                      const next = new Set(current);
                      if (next.has(question.id)) next.delete(question.id);
                      else next.add(question.id);
                      return next;
                    })
                  }
                  className={cn(
                    'flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/60',
                    isPending && 'border-primary bg-primary/5',
                    alreadySelected && 'cursor-not-allowed opacity-55'
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border',
                      (isPending || alreadySelected) &&
                        'border-primary bg-primary text-primary-foreground'
                    )}
                  >
                    {isPending || alreadySelected ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : null}
                  </span>
                  <span className="line-clamp-3 text-sm">
                    {question.prompt}
                  </span>
                </button>
              );
            })
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => handleOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button onClick={handleAdd} disabled={pendingIds.size === 0}>
            {t('addSelectedQuestions', { count: pendingIds.size })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
