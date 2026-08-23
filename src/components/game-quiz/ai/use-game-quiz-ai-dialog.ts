'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { gameQuizApi } from '../api';
import type {
  GameQuizDifficulty,
  GeneratedGameQuizQuestion,
  GenerateGameQuizQuestionsInput,
} from '../types';

export type GameQuizAiDialogStep = 'sources' | 'guidance' | 'review';

interface UseGameQuizAiDialogOptions {
  isOpen: boolean;
  maxQuestionCount: number;
  topic: string;
  difficulty: GameQuizDifficulty;
  onOpenChange: (open: boolean) => void;
  onAccept: (questions: GeneratedGameQuizQuestion[]) => void;
}

export function useGameQuizAiDialog({
  isOpen,
  maxQuestionCount,
  topic,
  difficulty,
  onOpenChange,
  onAccept,
}: UseGameQuizAiDialogOptions) {
  const [step, setStep] = useState<GameQuizAiDialogStep>('sources');
  const [courseId, setCourseIdState] = useState('');
  const [lessonIds, setLessonIds] = useState<string[]>([]);
  const [storedQuestionCount, setQuestionCountState] = useState(() =>
    Math.min(5, maxQuestionCount)
  );
  const [additionalPrompt, setAdditionalPrompt] = useState('');
  const [generatedQuestions, setGeneratedQuestions] = useState<
    GeneratedGameQuizQuestion[]
  >([]);
  const [reviewIndex, setReviewIndex] = useState(0);
  const generationEpoch = useRef(0);
  const questionCount = Math.min(storedQuestionCount, maxQuestionCount);

  const sourcesQuery = useQuery({
    queryKey: ['game-quiz', 'ai-sources'],
    queryFn: gameQuizApi.getAiSources,
    enabled: isOpen,
  });

  const generationMutation = useMutation({
    mutationFn: async (input: GenerateGameQuizQuestionsInput) => {
      const response = await gameQuizApi.generateAiQuestions(input);
      if (response.questions.length === 0) {
        throw new Error('AI generation returned no questions.');
      }
      return response;
    },
  });

  const reset = () => {
    generationEpoch.current += 1;
    setStep('sources');
    setCourseIdState('');
    setLessonIds([]);
    setQuestionCountState(Math.min(5, maxQuestionCount));
    setAdditionalPrompt('');
    setGeneratedQuestions([]);
    setReviewIndex(0);
    generationMutation.reset();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) reset();
    onOpenChange(open);
  };

  const setCourseId = (nextCourseId: string) => {
    setCourseIdState(nextCourseId);
    setLessonIds([]);
    generationMutation.reset();
  };

  const toggleLesson = (lessonId: string) => {
    setLessonIds((current) => {
      if (current.includes(lessonId)) {
        return current.filter((id) => id !== lessonId);
      }
      if (current.length >= 20) return current;
      return [...current, lessonId];
    });
  };

  const setQuestionCount = (count: number) => {
    setQuestionCountState(Math.min(maxQuestionCount, Math.max(1, count)));
  };

  const generate = async () => {
    if (!courseId || lessonIds.length === 0 || questionCount < 1) return;

    generationMutation.reset();
    const epoch = generationEpoch.current + 1;
    generationEpoch.current = epoch;
    try {
      const response = await generationMutation.mutateAsync({
        courseId,
        lessonIds,
        questionCount,
        additionalPrompt: additionalPrompt.trim() || undefined,
        topic: topic.trim() || undefined,
        difficulty,
      });
      if (generationEpoch.current !== epoch) return;
      setGeneratedQuestions(response.questions);
      setReviewIndex(0);
      setStep('review');
    } catch {
      // The mutation state supplies a visible, retryable error in the guidance step.
    }
  };

  const reject = () => {
    setGeneratedQuestions([]);
    setReviewIndex(0);
    setStep('sources');
    generationMutation.reset();
  };

  const accept = () => {
    if (generatedQuestions.length === 0) return;
    onAccept(generatedQuestions);
    handleOpenChange(false);
  };

  return {
    step,
    setStep,
    courseId,
    setCourseId,
    lessonIds,
    toggleLesson,
    questionCount,
    setQuestionCount,
    additionalPrompt,
    setAdditionalPrompt,
    generatedQuestions,
    reviewIndex,
    setReviewIndex,
    sourcesQuery,
    generationMutation,
    handleOpenChange,
    generate,
    reject,
    accept,
  };
}
