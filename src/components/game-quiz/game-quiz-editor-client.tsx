'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { GameQuizAiDialog } from './ai/game-quiz-ai-dialog';
import { gameQuizApi } from './api';
import { type GameQuizCopy, gameQuizCopy } from './copy';
import {
  appendGeneratedQuestions,
  createDraft,
  createQuestion,
  duplicateQuestion,
  getAiQuestionCapacity,
  isDraftValid,
  isGameQuizDraftDirty,
  MAX_GAME_QUIZ_QUESTIONS,
  moveQuestion,
} from './draft';
import { GameQuizEditorHeader } from './editor/game-quiz-editor-header';
import { GameQuizEditorSettings } from './editor/game-quiz-editor-settings';
import { GameQuizQuestionCanvas } from './editor/game-quiz-question-canvas';
import { GameQuizQuestionSidebar } from './editor/game-quiz-question-sidebar';
import { activateLiveGameSession } from './live-game-session';
import type {
  GameQuizDraft,
  GameQuizQuestion,
  GeneratedGameQuizQuestion,
} from './types';

interface GameQuizEditorClientProps {
  copy?: GameQuizCopy;
  gameQuizId?: string;
}

function asDraft(
  game: NonNullable<Awaited<ReturnType<typeof gameQuizApi.get>>>
): GameQuizDraft {
  return {
    title: game.title,
    topic: game.topic,
    difficulty: game.difficulty,
    settings: game.settings,
    revision: game.revision,
    questions: game.questions ?? [],
  };
}

export function GameQuizEditorClient({
  copy = gameQuizCopy,
  gameQuizId,
}: GameQuizEditorClientProps) {
  const initializationKey = useRef<string | null>(null);
  const router = useRouter();
  const queryClient = useQueryClient();
  const gameQuery = useQuery({
    queryKey: ['game-quiz', gameQuizId],
    queryFn: () => gameQuizApi.get(gameQuizId as string),
    enabled: Boolean(gameQuizId),
  });

  const [draft, setDraft] = useState<GameQuizDraft>(createDraft);
  const [originalDraft, setOriginalDraft] = useState<
    GameQuizDraft | undefined
  >();
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);
  const [loadedId, setLoadedId] = useState<string | undefined>();

  if (gameQuizId && gameQuery.data && loadedId !== gameQuizId) {
    setDraft(asDraft(gameQuery.data));
    setOriginalDraft(asDraft(gameQuery.data));
    setLoadedId(gameQuizId);
  }

  const showMutationError = (error: unknown) => {
    const code =
      error && typeof error === 'object' && 'code' in error
        ? error.code
        : undefined;
    toast.error(
      code === 'REVISION_CONFLICT' ? copy.editor.conflict : copy.common.error
    );
  };

  const createMutation = useMutation({
    mutationFn: () => gameQuizApi.create(draft),
    onSuccess: (game) => {
      queryClient.setQueryData(['game-quiz', game.id], game);
      toast.success(copy.editor.saved);
      router.replace(`/games/${game.id}/edit`);
    },
    onError: showMutationError,
  });

  const saveMutation = useMutation({
    mutationFn: () => gameQuizApi.saveQuestions(gameQuizId!, draft),
    onSuccess: (game) => {
      const savedDraft = asDraft(game);
      setDraft(savedDraft);
      setOriginalDraft(savedDraft);
      queryClient.setQueryData(['game-quiz', game.id], game);
      toast.success(copy.editor.saved);
    },
    onError: showMutationError,
  });

  const hostMutation = useMutation({
    mutationFn: (expectedRevision: number) => {
      initializationKey.current ??= crypto.randomUUID();
      return gameQuizApi.createSession(
        gameQuizId!,
        expectedRevision,
        initializationKey.current
      );
    },
    onSuccess: (session) => {
      initializationKey.current = null;
      activateLiveGameSession({
        audience: 'HOST',
        sessionId: session.sessionId,
        version: 3,
      });
      router.push(`/games/${gameQuizId}/host`);
    },
    onError: showMutationError,
  });

  const activeQuestion =
    draft.questions[activeQuestionIndex] ?? draft.questions[0];
  const valid = useMemo(() => isDraftValid(draft), [draft]);
  const isDirty = useMemo(
    () => isGameQuizDraftDirty(draft, originalDraft),
    [draft, originalDraft]
  );

  const updateQuestion = (
    key: keyof Omit<GameQuizQuestion, 'id' | 'options' | 'order'>,
    value: string | number
  ) => {
    setDraft((current) => ({
      ...current,
      questions: current.questions.map((question, index) =>
        index === activeQuestionIndex ? { ...question, [key]: value } : question
      ),
    }));
  };

  const updateOption = (optionIndex: number, text: string) => {
    setDraft((current) => ({
      ...current,
      questions: current.questions.map((question, questionIndex) =>
        questionIndex === activeQuestionIndex
          ? {
              ...question,
              options: question.options.map((option, index) =>
                index === optionIndex ? { ...option, text } : option
              ),
            }
          : question
      ),
    }));
  };

  const markCorrect = (optionIndex: number) => {
    setDraft((current) => ({
      ...current,
      questions: current.questions.map((question, questionIndex) =>
        questionIndex === activeQuestionIndex
          ? {
              ...question,
              options: question.options.map((option, index) => ({
                ...option,
                isCorrect: index === optionIndex,
              })),
            }
          : question
      ),
    }));
  };

  const addOption = () => {
    setDraft((current) => ({
      ...current,
      questions: current.questions.map((question, questionIndex) =>
        questionIndex === activeQuestionIndex
          ? {
              ...question,
              options: [
                ...question.options,
                {
                  id: `draft-option-${crypto.randomUUID()}`,
                  text: '',
                  isCorrect: false,
                  order: question.options.length,
                },
              ],
            }
          : question
      ),
    }));
  };

  const removeOption = (optionIndex: number) => {
    setDraft((current) => ({
      ...current,
      questions: current.questions.map((question, questionIndex) =>
        questionIndex === activeQuestionIndex
          ? {
              ...question,
              options: question.options
                .filter((_, index) => index !== optionIndex)
                .map((item, order) => ({ ...item, order })),
            }
          : question
      ),
    }));
  };

  const addQuestion = () => {
    if (draft.questions.length >= MAX_GAME_QUIZ_QUESTIONS) return;
    setDraft((current) => ({
      ...current,
      questions: [
        ...current.questions,
        createQuestion(current.questions.length),
      ],
    }));
    setActiveQuestionIndex(draft.questions.length);
  };

  const handleDuplicateQuestion = (index: number) => {
    if (draft.questions.length >= MAX_GAME_QUIZ_QUESTIONS) return;
    const result = duplicateQuestion(draft, index);
    setDraft(result.draft);
    setActiveQuestionIndex(result.newIndex);
  };

  const handleMoveQuestion = (fromIndex: number, toIndex: number) => {
    const result = moveQuestion(draft, fromIndex, toIndex);
    setDraft(result.draft);
    setActiveQuestionIndex(result.newIndex);
  };

  const removeQuestion = (indexToRemove: number) => {
    if (draft.questions.length === 1) return;
    setDraft((current) => ({
      ...current,
      questions: current.questions
        .filter((_, index) => index !== indexToRemove)
        .map((question, order) => ({ ...question, order })),
    }));
    setActiveQuestionIndex((current) =>
      current >= indexToRemove ? Math.max(0, current - 1) : current
    );
  };

  const handleAcceptGeneratedQuestions = (
    questions: GeneratedGameQuizQuestion[]
  ) => {
    const result = appendGeneratedQuestions(draft, questions, {
      replacePristineStarter: !gameQuizId,
    });
    if (result.appendedCount === 0) return;
    setDraft(result.draft);
    setActiveQuestionIndex(result.firstGeneratedIndex);
  };

  const aiQuestionCapacity = Math.min(
    20,
    getAiQuestionCapacity(draft, !gameQuizId)
  );

  if (gameQuizId && gameQuery.isPending) {
    return (
      <div className="flex min-h-72 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
        {copy.common.loading}
      </div>
    );
  }

  if (gameQuizId && gameQuery.isError) {
    return (
      <section
        className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6"
        role="alert"
      >
        <p className="font-semibold text-destructive text-sm">
          {copy.common.error}
        </p>
        <Button
          className="mt-4 rounded-xl"
          onClick={() => gameQuery.refetch()}
          variant="outline"
        >
          {copy.common.retry}
        </Button>
      </section>
    );
  }

  return (
    <main className="space-y-6 pb-12">
      {/* Header with status and actions */}
      <GameQuizEditorHeader
        copy={copy}
        gameQuizId={gameQuizId}
        isCreatePending={createMutation.isPending}
        isDirty={isDirty}
        isHostPending={hostMutation.isPending}
        isSavePending={saveMutation.isPending}
        isValid={valid}
        onBrowsePreview={() => router.push(`/games/${gameQuizId}/preview`)}
        onCreateGame={() => createMutation.mutate()}
        onHostGame={() => {
          if (originalDraft?.revision) {
            hostMutation.mutate(originalDraft.revision);
          }
        }}
        onSaveDraft={() => saveMutation.mutate()}
      />

      {/* Validation status notification */}
      {!valid ? (
        <div
          className="flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-amber-800 text-sm shadow-xs dark:text-amber-300"
          role="status"
        >
          <AlertCircle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>{copy.editor.validation}</span>
        </div>
      ) : null}

      <GameQuizEditorSettings
        copy={copy}
        draft={draft}
        onUpdateDraft={setDraft}
      />

      {/* 2-Column Responsive Grid Layout */}
      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        {/* Left: Question Navigator */}
        <GameQuizQuestionSidebar
          activeIndex={activeQuestionIndex}
          canAddQuestions={draft.questions.length < MAX_GAME_QUIZ_QUESTIONS}
          copy={copy}
          draft={draft}
          onAddQuestion={addQuestion}
          onGenerateWithAi={() => setIsAiDialogOpen(true)}
          onDuplicateQuestion={handleDuplicateQuestion}
          onMoveQuestion={handleMoveQuestion}
          onRemoveQuestion={removeQuestion}
          onSelectIndex={setActiveQuestionIndex}
        />

        {/* Right: Main Question Canvas */}
        {activeQuestion ? (
          <GameQuizQuestionCanvas
            activeIndex={activeQuestionIndex}
            canDuplicateQuestion={
              draft.questions.length < MAX_GAME_QUIZ_QUESTIONS
            }
            copy={copy}
            onAddOption={addOption}
            onDuplicateQuestion={() =>
              handleDuplicateQuestion(activeQuestionIndex)
            }
            onMarkCorrect={markCorrect}
            onNextQuestion={() =>
              setActiveQuestionIndex((prev) =>
                Math.min(draft.questions.length - 1, prev + 1)
              )
            }
            onPrevQuestion={() =>
              setActiveQuestionIndex((prev) => Math.max(0, prev - 1))
            }
            onRemoveOption={removeOption}
            onRemoveQuestion={() => removeQuestion(activeQuestionIndex)}
            onUpdateOption={updateOption}
            onUpdateQuestion={updateQuestion}
            question={activeQuestion}
            totalQuestions={draft.questions.length}
          />
        ) : null}
      </div>

      <GameQuizAiDialog
        copy={copy}
        isOpen={isAiDialogOpen}
        maxQuestionCount={aiQuestionCapacity}
        onAccept={handleAcceptGeneratedQuestions}
        onOpenChange={setIsAiDialogOpen}
        topic={draft.topic}
      />
    </main>
  );
}
