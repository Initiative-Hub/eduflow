import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/api-client';
import type {
  QuestionBankEntry,
  QuestionSubType,
  QuizCategory,
  QuizConfiguration,
  QuizDefinition,
} from '@/lib/quiz-template';
import { generateQuestionsFromLesson } from '@/lib/quiz-template';
import type { QuestionBlock } from '@/lib/quiz-template/types';
import { getQuestionPrompt } from '@/utils/quiz-question-references';
import { quizService } from './(course-tabs)/quiz/quiz.service';

// ─── Question Bank Hook ──────────────────────────────────────────────────────

interface UseQuestionBankOptions {
  courseId: string;
  loadQuestions?: boolean;
}

export function useQuestionBank({ courseId, loadQuestions = true }: UseQuestionBankOptions) {
  const queryClient = useQueryClient();
  const t = useTranslations('Courses.CreateQuiz');
  const tQuestionBank = useTranslations('Courses.QuestionBank');

  // Fetch all questions for the course via real API
  const questionsQuery = useQuery({
    queryKey: ['question-bank', courseId],
    queryFn: async (): Promise<QuestionBankEntry[]> => {
      return apiClient.get<QuestionBankEntry[]>(
        `v1/courses/${courseId}/questions`
      );
    },
    enabled: !!courseId && loadQuestions,
  });

  // Fetch quizzes for the course via real API
  const quizzesQuery = useQuery({
    queryKey: ['quizzes', courseId],
    queryFn: async (): Promise<QuizDefinition[]> => {
      return apiClient.get<QuizDefinition[]>(`v1/courses/${courseId}/quizzes`);
    },
    enabled: !!courseId,
  });

  // Add question to bank via real API
  const addQuestionMutation = useMutation({
    mutationFn: async (
      question: Omit<QuestionBankEntry, 'id' | 'createdAt' | 'updatedAt'>
    ) => {
      return apiClient.post<QuestionBankEntry>(
        `v1/courses/${courseId}/questions`,
        {
          lessonId: question.lessonId,
          category: question.category,
          subType: question.subType,
          prompt: question.prompt,
          answerData: question.answerData,
          explanation: question.explanation,
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['question-bank', courseId] });
      toast.success('Question added to bank');
    },
    onError: () => {
      toast.error('Failed to add question');
    },
  });

  // Delete question from bank via real API
  const deleteQuestionMutation = useMutation({
    mutationFn: async (questionId: string) => {
      await apiClient.delete(`v1/questions/${questionId}`);
      return questionId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['question-bank', courseId] });
      toast.success('Question deleted');
    },
    onError: () => {
      toast.error('Failed to delete question');
    },
  });

  const updateQuestionMutation = useMutation({
    mutationFn: async ({
      questionId,
      question,
    }: {
      questionId: string;
      question: QuestionBlock;
    }) =>
      apiClient.put<QuestionBankEntry>(`v1/questions/${questionId}`, {
        prompt: getQuestionPrompt(question),
        answerData: question,
        explanation: question.explanation ?? null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['question-bank', courseId] });
      queryClient.invalidateQueries({ queryKey: ['quizzes', courseId] });
      toast.success(tQuestionBank('questionUpdateSuccess'));
    },
    onError: () => toast.error(tQuestionBank('questionUpdateError')),
  });

  // Create quiz via real API
  const createQuizMutation = useMutation({
    mutationFn: async (
      config: QuizConfiguration & {
        lessonIds: string[];
        questions?: QuestionBlock[];
        questionIds?: Array<string | null>;
      }
    ) => {
      return apiClient.post<QuizDefinition>(`v1/courses/${courseId}/quizzes`, {
        lessonIds: config.lessonIds,
        title: config.title,
        description: config.description,
        questionCounts: config.questionCounts,
        deliveryMode: config.deliveryMode,
        selectionMethod: config.selectionMethod,
        questionCount: config.questionCount,
        questions: config.questions ?? [],
        questionIds: config.questionIds,
      });
    },
    onSuccess: (createdQuiz) => {
      queryClient.setQueryData<QuizDefinition[]>(
        ['quizzes', courseId],
        (oldQuizzes = []) => {
          if (oldQuizzes.some((quiz) => quiz.id === createdQuiz.id)) {
            return oldQuizzes;
          }

          return [createdQuiz, ...oldQuizzes];
        }
      );

      queryClient.invalidateQueries({ queryKey: ['quizzes', courseId] });
      queryClient.invalidateQueries({ queryKey: ['modules', courseId] });
      toast.success('Quiz created successfully');
    },
    onError: () => {
      toast.error('Failed to create quiz');
    },
  });

  const createGeneratedQuizMutation = useMutation({
    mutationFn: async (config: QuizConfiguration & { lessonIds: string[] }) => {
      return quizService.createGeneratedQuiz(courseId, config);
    },
    onSuccess: (generatedQuiz) => {
      queryClient.setQueryData<QuizDefinition[]>(
        ['quizzes', courseId],
        (oldQuizzes = []) => {
          const existingIndex = oldQuizzes.findIndex(
            (quiz) => quiz.id === generatedQuiz.id
          );

          if (existingIndex === -1) {
            return [generatedQuiz, ...oldQuizzes];
          }

          return oldQuizzes.map((quiz) =>
            quiz.id === generatedQuiz.id ? { ...quiz, ...generatedQuiz } : quiz
          );
        }
      );

      queryClient.invalidateQueries({ queryKey: ['quizzes', courseId] });
      queryClient.invalidateQueries({ queryKey: ['modules', courseId] });
      toast.success(t('createWithAISuccess'));
    },
    onError: () => {
      toast.error(t('createWithAIError'));
    },
  });

  const generateDraftQuizMutation = useMutation({
    mutationFn: (params: {
      lessonIds: string[];
      questionCounts: Partial<Record<QuestionSubType, number>>;
      context?: string;
    }) => quizService.generateDraft(courseId, params),
    onError: () => toast.error(t('createWithAIError')),
  });

  // AI question generation (still uses the placeholder function)
  const generateQuestionsMutation = useMutation({
    mutationFn: async (params: {
      lessonId: string;
      category: QuizCategory;
      subType: QuestionSubType;
      count: number;
    }) => {
      return generateQuestionsFromLesson(
        params.lessonId,
        params.category,
        params.subType,
        params.count
      );
    },
  });

  return {
    questions: questionsQuery.data ?? [],
    isLoadingQuestions: questionsQuery.isLoading,

    quizzes: quizzesQuery.data ?? [],
    isLoadingQuizzes: quizzesQuery.isLoading,
    isQuizzesError: quizzesQuery.isError,
    refetchQuizzes: quizzesQuery.refetch,

    addQuestion: addQuestionMutation.mutate,
    isAddingQuestion: addQuestionMutation.isPending,

    deleteQuestion: deleteQuestionMutation.mutate,
    isDeletingQuestion: deleteQuestionMutation.isPending,

    updateQuestion: updateQuestionMutation.mutate,
    isUpdatingQuestion: updateQuestionMutation.isPending,

    createQuiz: createQuizMutation.mutate,
    isCreatingQuiz: createQuizMutation.isPending,

    createGeneratedQuiz: createGeneratedQuizMutation.mutate,
    isCreatingGeneratedQuiz: createGeneratedQuizMutation.isPending,
    createGeneratedQuizError: createGeneratedQuizMutation.error,

    generateDraftQuiz: generateDraftQuizMutation.mutate,
    isGeneratingDraftQuiz: generateDraftQuizMutation.isPending,
    generateDraftQuizError: generateDraftQuizMutation.error,

    generateQuestions: generateQuestionsMutation.mutateAsync,
    isGeneratingQuestions: generateQuestionsMutation.isPending,
    generateQuestionsError: generateQuestionsMutation.error,
    generatedQuestions: generateQuestionsMutation.data ?? [],
  };
}

// ─── Filter Hook ─────────────────────────────────────────────────────────────

export function useQuestionBankFilters(questions: QuestionBankEntry[]) {
  const [categoryFilters, setCategoryFilters] = useState<Set<QuizCategory>>(
    new Set()
  );
  const [subTypeFilters, setSubTypeFilters] = useState<Set<QuestionSubType>>(
    new Set()
  );
  const [lessonFilters, setLessonFilters] = useState<Set<string>>(new Set());
  const [includeNoLesson, setIncludeNoLesson] = useState(false);

  const toggleCategory = useCallback((cat: QuizCategory) => {
    setCategoryFilters((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }, []);

  const toggleSubType = useCallback((st: QuestionSubType) => {
    setSubTypeFilters((prev) => {
      const next = new Set(prev);
      if (next.has(st)) next.delete(st);
      else next.add(st);
      return next;
    });
  }, []);

  const toggleLesson = useCallback((lessonId: string) => {
    setLessonFilters((prev) => {
      const next = new Set(prev);
      if (next.has(lessonId)) next.delete(lessonId);
      else next.add(lessonId);
      return next;
    });
  }, []);

  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      if (categoryFilters.size > 0 && !categoryFilters.has(q.category))
        return false;
      if (subTypeFilters.size > 0 && !subTypeFilters.has(q.subType))
        return false;
      if (lessonFilters.size > 0 || includeNoLesson) {
        const matchesLesson = q.lessonId && lessonFilters.has(q.lessonId);
        const matchesNoLesson = includeNoLesson && q.lessonId === null;
        if (!matchesLesson && !matchesNoLesson) return false;
      }
      return true;
    });
  }, [
    questions,
    categoryFilters,
    subTypeFilters,
    lessonFilters,
    includeNoLesson,
  ]);

  const hasActiveFilters =
    categoryFilters.size > 0 ||
    subTypeFilters.size > 0 ||
    lessonFilters.size > 0 ||
    includeNoLesson;

  const resetFilters = useCallback(() => {
    setCategoryFilters(new Set());
    setSubTypeFilters(new Set());
    setLessonFilters(new Set());
    setIncludeNoLesson(false);
  }, []);

  return {
    filteredQuestions,
    categoryFilters,
    toggleCategory,
    subTypeFilters,
    toggleSubType,
    lessonFilters,
    toggleLesson,
    includeNoLesson,
    setIncludeNoLesson,
    hasActiveFilters,
    resetFilters,
  };
}
