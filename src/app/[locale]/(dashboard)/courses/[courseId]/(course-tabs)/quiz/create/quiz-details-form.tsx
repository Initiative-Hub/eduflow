'use client';

import { useTranslations } from 'next-intl';
import { Checkbox } from '@/components/ui/checkbox';
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
import { DELIVERY_MODE_LABELS, type DeliveryMode } from '@/lib/quiz-template';

interface QuizDetailsFormProps {
  title: string;
  description: string;
  lessonIds: string[];
  lessons: Array<{ id: string; title: string }>;
  deliveryMode: DeliveryMode;
  showErrors: boolean;
  hideLessonSelector: boolean;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onLessonIdsChange: (value: string[]) => void;
  onDeliveryModeChange: (value: DeliveryMode) => void;
}

export function QuizDetailsForm({
  title,
  description,
  lessonIds,
  lessons,
  deliveryMode,
  showErrors,
  hideLessonSelector,
  onTitleChange,
  onDescriptionChange,
  onLessonIdsChange,
  onDeliveryModeChange,
}: QuizDetailsFormProps) {
  const t = useTranslations('Courses.CreateQuiz');

  return (
    <section className="grid gap-6 rounded-2xl border bg-card p-5 md:grid-cols-[minmax(0,1fr)_minmax(16rem,0.7fr)] md:p-6">
      <div className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="quiz-title-draft">{t('quizTitle')}</Label>
          <Input
            id="quiz-title-draft"
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
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
          <Label htmlFor="quiz-description-draft">{t('quizDescription')}</Label>
          <Textarea
            id="quiz-description-draft"
            value={description}
            onChange={(event) => onDescriptionChange(event.target.value)}
            placeholder={t('quizDescriptionPlaceholder')}
            rows={3}
          />
        </div>
      </div>

      <div className="space-y-5">
        {!hideLessonSelector ? (
          <fieldset className="space-y-2">
            <legend className="font-medium text-sm">
              {t('selectLessons')}
            </legend>
            <div className="max-h-40 overflow-y-auto rounded-xl border p-1.5">
              {lessons.map((lesson) => (
                <label
                  key={lesson.id}
                  className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-muted/60"
                >
                  <Checkbox
                    checked={lessonIds.includes(lesson.id)}
                    onCheckedChange={() =>
                      onLessonIdsChange(
                        lessonIds.includes(lesson.id)
                          ? lessonIds.filter((id) => id !== lesson.id)
                          : [...lessonIds, lesson.id]
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
        ) : null}
        <div className="space-y-2">
          <Label>{t('deliveryMode')}</Label>
          <Select
            value={deliveryMode}
            onValueChange={(value) =>
              onDeliveryModeChange(value as DeliveryMode)
            }
          >
            <SelectTrigger className="min-h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(DELIVERY_MODE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </section>
  );
}
