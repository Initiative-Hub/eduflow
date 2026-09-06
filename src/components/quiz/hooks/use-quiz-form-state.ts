'use client';

import { useState } from 'react';
import type {
  DeliveryMode,
  QuestionSubType,
  QuizCategory,
} from '@/lib/quiz-template';
import { QUIZ_CATEGORIES } from '@/lib/quiz-template';

export interface QuizFormState {
  title: string;
  description: string;
  category: QuizCategory | '';
  deliveryMode: DeliveryMode;
  questionCounts: Partial<Record<QuestionSubType, string>>;
  contentSource: 'specific-lessons' | 'all-modules';
  selectedLessonIds: string[];
}

export interface UseQuizFormStateOptions {
  preselectedLessonId?: string;
}

export function useQuizFormState(options: UseQuizFormStateOptions = {}) {
  const { preselectedLessonId } = options;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<QuizCategory | ''>('');
  const [deliveryMode, setDeliveryMode] =
    useState<DeliveryMode>('INSTANT_FEEDBACK');
  const [questionCounts, setQuestionCounts] = useState<
    Partial<Record<QuestionSubType, string>>
  >({});
  const [contentSource, setContentSource] = useState<
    'specific-lessons' | 'all-modules'
  >(preselectedLessonId ? 'specific-lessons' : 'specific-lessons');
  const [selectedLessonIds, setSelectedLessonIds] = useState<string[]>(
    preselectedLessonId ? [preselectedLessonId] : []
  );

  const handleCategoryChange = (value: QuizCategory) => {
    setCategory(value);
    setQuestionCounts({});
  };

  const setQuestionCount = (subType: QuestionSubType, value: string) => {
    setQuestionCounts((current) => ({ ...current, [subType]: value }));
  };

  const toggleLessonSelection = (lessonId: string) => {
    setSelectedLessonIds((prev) =>
      prev.includes(lessonId)
        ? prev.filter((id) => id !== lessonId)
        : [...prev, lessonId]
    );
  };

  const selectAllLessons = (allLessonIds: string[]) => {
    setSelectedLessonIds(allLessonIds);
  };

  const deselectAllLessons = () => {
    setSelectedLessonIds([]);
  };

  const availableSubTypes = category ? QUIZ_CATEGORIES[category].subTypes : [];

  const formState: QuizFormState = {
    title,
    description,
    category,
    deliveryMode,
    questionCounts,
    contentSource,
    selectedLessonIds,
  };

  return {
    formState,
    setTitle,
    setDescription,
    handleCategoryChange,
    setDeliveryMode,
    setQuestionCount,
    setContentSource,
    setSelectedLessonIds,
    toggleLessonSelection,
    selectAllLessons,
    deselectAllLessons,
    availableSubTypes,
  };
}
