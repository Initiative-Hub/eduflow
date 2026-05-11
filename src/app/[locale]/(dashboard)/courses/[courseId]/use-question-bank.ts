import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import type {
  QuestionBankEntry,
  QuestionSubType,
  QuizCategory,
  QuizConfiguration,
  QuizDefinition,
} from '@/lib/quiz-template';
import {
  generateQuestionsFromLesson,
  MOCK_QUESTIONS,
  MOCK_QUIZZES,
} from '@/lib/quiz-template';

// ─── Question Bank Hook ──────────────────────────────────────────────────────

interface UseQuestionBankOptions {
  courseId: string;
}

export function useQuestionBank({ courseId }: UseQuestionBankOptions) {
  const queryClient = useQueryClient();

  // Fetch all questions for the course (using mock data for now)
  const questionsQuery = useQuery({
    queryKey: ['question-bank', courseId],
    queryFn: async (): Promise<QuestionBankEntry[]> => {
      // TODO: Replace with real API call
      await new Promise((resolve) => setTimeout(resolve, 300));
      return MOCK_QUESTIONS.filter((q) => q.courseId === courseId);
    },
    enabled: !!courseId,
  });

  // Fetch quizzes for the course
  const quizzesQuery = useQuery({
    queryKey: ['quizzes', courseId],
    queryFn: async (): Promise<QuizDefinition[]> => {
      // TODO: Replace with real API call
      await new Promise((resolve) => setTimeout(resolve, 200));
      return MOCK_QUIZZES.filter((q) => q.courseId === courseId);
    },
    enabled: !!courseId,
  });

  // Add question to bank
  const addQuestionMutation = useMutation({
    mutationFn: async (
      question: Omit<QuestionBankEntry, 'id' | 'createdAt' | 'updatedAt'>
    ) => {
      // TODO: Replace with real API call
      await new Promise((resolve) => setTimeout(resolve, 300));
      const newQuestion: QuestionBankEntry = {
        ...question,
        id: `q-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return newQuestion;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['question-bank', courseId] });
      toast.success('Question added to bank');
    },
    onError: () => {
      toast.error('Failed to add question');
    },
  });

  // Delete question from bank
  const deleteQuestionMutation = useMutation({
    mutationFn: async (questionId: string) => {
      // TODO: Replace with real API call
      await new Promise((resolve) => setTimeout(resolve, 300));
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

  // Create quiz
  const createQuizMutation = useMutation({
    mutationFn: async (config: QuizConfiguration & { lessonId: string }) => {
      // TODO: Replace with real API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      const newQuiz: QuizDefinition = {
        id: `quiz-${Date.now()}`,
        courseId,
        lessonId: config.lessonId,
        title: config.title,
        description: config.description,
        category: config.category,
        subType: config.subType,
        deliveryMode: config.deliveryMode,
        selectionMethod: config.selectionMethod,
        questionCount: config.questionCount,
        questions: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return newQuiz;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizzes', courseId] });
      queryClient.invalidateQueries({ queryKey: ['modules', courseId] });
      toast.success('Quiz created successfully');
    },
    onError: () => {
      toast.error('Failed to create quiz');
    },
  });

  // AI question generation
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

    addQuestion: addQuestionMutation.mutate,
    isAddingQuestion: addQuestionMutation.isPending,

    deleteQuestion: deleteQuestionMutation.mutate,
    isDeletingQuestion: deleteQuestionMutation.isPending,

    createQuiz: createQuizMutation.mutate,
    isCreatingQuiz: createQuizMutation.isPending,

    generateQuestions: generateQuestionsMutation.mutateAsync,
    isGeneratingQuestions: generateQuestionsMutation.isPending,
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
