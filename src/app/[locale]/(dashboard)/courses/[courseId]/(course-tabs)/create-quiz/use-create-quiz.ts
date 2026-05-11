import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type {
  DeliveryMode,
  QuestionSubType,
  QuizCategory,
  SelectionMethod,
} from '@/lib/quiz-template';
import { QUIZ_CATEGORIES } from '@/lib/quiz-template';
import { useModules } from '../../use-modules';
import { useQuestionBank } from '../../use-question-bank';

interface UseCreateQuizOptions {
  courseId: string;
  lessonId?: string;
  preselectedModuleId?: string;
}

export function useCreateQuiz({
  courseId,
  lessonId: preselectedLessonId,
  preselectedModuleId,
}: UseCreateQuizOptions) {
  const t = useTranslations('Courses.CreateQuiz');
  const router = useRouter();
  const { modules } = useModules(courseId);
  const {
    questions,
    createQuiz,
    isCreatingQuiz,
    generateQuestions,
    isGeneratingQuestions,
  } = useQuestionBank({ courseId });

  const [selectedLessonId, setSelectedLessonId] = useState<string>(
    preselectedLessonId ?? ''
  );
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<QuizCategory | ''>('');
  const [subType, setSubType] = useState<QuestionSubType | ''>('');
  const [deliveryMode, setDeliveryMode] =
    useState<DeliveryMode>('instant-feedback');
  const [selectionMethod, setSelectionMethod] =
    useState<SelectionMethod>('hand-pick');
  const [questionCount, setQuestionCount] = useState<string>('5');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Get lessons from the preselected module or all modules
  const availableLessons = preselectedModuleId
    ? (modules.find((m) => m.id === preselectedModuleId)?.lessons ?? [])
    : modules.flatMap((m) => m.lessons);

  const availableSubTypes = category ? QUIZ_CATEGORIES[category].subTypes : [];

  // Count available questions matching current filters
  const matchingQuestionCount = questions.filter(
    (q) => q.category === category && q.subType === subType
  ).length;

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!selectedLessonId) newErrors.lesson = t('errors.lessonRequired');
    if (!title.trim()) newErrors.title = t('errors.titleRequired');
    if (!category) newErrors.category = t('errors.categoryRequired');
    if (!subType) newErrors.subType = t('errors.subTypeRequired');
    const count = Number.parseInt(questionCount, 10) || 0;
    if (count < 1) newErrors.questionCount = t('errors.questionCountMin');
    if (selectionMethod === 'hand-pick' && matchingQuestionCount < count) {
      newErrors.questionCount = t('errors.insufficientQuestions', {
        available: matchingQuestionCount,
        requested: count,
      });
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    createQuiz(
      {
        lessonId: selectedLessonId,
        title: title.trim(),
        description: description.trim() || undefined,
        category: category as QuizCategory,
        subType: subType as QuestionSubType,
        deliveryMode,
        selectionMethod,
        questionCount: Number.parseInt(questionCount, 10) || 1,
      },
      {
        onSuccess: () => router.push(`/courses/${courseId}`),
      }
    );
  };

  const handleGenerateWithAI = async () => {
    if (!category || !subType || !selectedLessonId) return;
    try {
      await generateQuestions({
        lessonId: selectedLessonId,
        category: category as QuizCategory,
        subType: subType as QuestionSubType,
        count: Number.parseInt(questionCount, 10) || 5,
      });
    } catch {
      // handled by mutation
    }
  };

  const handleCategoryChange = (value: QuizCategory) => {
    setCategory(value);
    setSubType('');
  };

  return {
    // State
    selectedLessonId,
    setSelectedLessonId,
    title,
    setTitle,
    description,
    setDescription,
    category,
    handleCategoryChange,
    subType,
    setSubType,
    deliveryMode,
    setDeliveryMode,
    selectionMethod,
    setSelectionMethod,
    questionCount,
    setQuestionCount,
    errors,

    // Derived
    availableLessons,
    availableSubTypes,
    matchingQuestionCount,

    // Actions
    handleSubmit,
    handleGenerateWithAI,
    isCreatingQuiz,
    isGeneratingQuestions,
  };
}
