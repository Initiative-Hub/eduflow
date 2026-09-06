'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { QuizFormState } from './use-quiz-form-state';

export function useQuizValidation(formState: QuizFormState) {
  const t = useTranslations('Courses.CreateQuiz');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (
      formState.contentSource === 'specific-lessons' &&
      formState.selectedLessonIds.length === 0
    ) {
      newErrors.lesson = t('errors.lessonRequired');
    }
    if (!formState.title.trim()) {
      newErrors.title = t('errors.titleRequired');
    }
    if (!formState.category) {
      newErrors.category = t('errors.categoryRequired');
    }
    const count = Object.values(formState.questionCounts).reduce(
      (total, value) => total + (Number.parseInt(value ?? '', 10) || 0),
      0
    );
    if (count < 1) {
      newErrors.questionCount = t('errors.questionCountMin');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  return { errors, validate };
}
