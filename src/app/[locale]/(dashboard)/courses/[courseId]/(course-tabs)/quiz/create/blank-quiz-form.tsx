'use client';

import { Library, ListPlus, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { QuizCreationMethod } from './quiz-creation-methods';

interface BlankQuizFormData {
  title: string;
  description: string;
  lessonIds: string[];
}

interface BlankQuizFormProps {
  method: Exclude<QuizCreationMethod, 'ai'>;
  lessons: Array<{ id: string; title: string }>;
  initialLessonIds: string[];
  isSubmitting: boolean;
  onBack: () => void;
  onSubmit: (data: BlankQuizFormData) => void;
}

export function BlankQuizForm({
  method,
  lessons,
  initialLessonIds,
  isSubmitting,
  onBack,
  onSubmit,
}: BlankQuizFormProps) {
  const t = useTranslations('Courses.CreateQuiz');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [lessonIds, setLessonIds] = useState(initialLessonIds);
  const [showErrors, setShowErrors] = useState(false);
  const Icon = method === 'manual' ? ListPlus : Library;

  const handleSubmit = () => {
    setShowErrors(true);
    if (!title.trim() || lessonIds.length === 0) return;
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      lessonIds,
    });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 rounded-2xl border bg-card p-6 sm:p-8">
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="font-semibold text-xl">
            {t(`methods.${method}.setupTitle`)}
          </h2>
          <p className="mt-1 text-muted-foreground text-sm">
            {t(`methods.${method}.setupDescription`)}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="blank-quiz-title">{t('quizTitle')}</Label>
        <Input
          id="blank-quiz-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={t('quizTitlePlaceholder')}
          aria-invalid={showErrors && !title.trim()}
        />
        {showErrors && !title.trim() ? (
          <p className="text-destructive text-xs" role="alert">
            {t('errors.titleRequired')}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="blank-quiz-description">{t('quizDescription')}</Label>
        <Textarea
          id="blank-quiz-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder={t('quizDescriptionPlaceholder')}
          rows={3}
        />
      </div>

      <fieldset className="space-y-2">
        <Label asChild>
          <legend>{t('selectLessons')}</legend>
        </Label>
        <div className="max-h-60 space-y-1 overflow-y-auto rounded-xl border p-2">
          {lessons.map((lesson) => (
            <label
              key={lesson.id}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted/60"
            >
              <Checkbox
                checked={lessonIds.includes(lesson.id)}
                onCheckedChange={() =>
                  setLessonIds((current) =>
                    current.includes(lesson.id)
                      ? current.filter((id) => id !== lesson.id)
                      : [...current, lesson.id]
                  )
                }
              />
              <span className="text-sm">{lesson.title}</span>
            </label>
          ))}
        </div>
        {showErrors && lessonIds.length === 0 ? (
          <p className="text-destructive text-xs" role="alert">
            {t('errors.lessonRequired')}
          </p>
        ) : null}
      </fieldset>

      <div className="flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onBack}>
          {t('backToMethods')}
        </Button>
        <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          {t(`methods.${method}.continue`)}
        </Button>
      </div>
    </div>
  );
}
