'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Play,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { gameQuizApi } from './api';
import { type GameQuizCopy, gameQuizCopy } from './copy';
import {
  createDraft,
  createQuestion,
  isDraftValid,
  isGameQuizDraftDirty,
} from './draft';
import type { GameQuizDraft, GameQuizQuestion } from './types';

interface GameQuizEditorClientProps {
  gameQuizId?: string;
  copy?: GameQuizCopy;
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
  gameQuizId,
  copy = gameQuizCopy,
}: GameQuizEditorClientProps) {
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
  const [loadedId, setLoadedId] = useState<string | undefined>();

  if (gameQuizId && gameQuery.data && loadedId !== gameQuizId) {
    setDraft(asDraft(gameQuery.data));
    setOriginalDraft(asDraft(gameQuery.data));
    setLoadedId(gameQuizId);
  }

  const saveMutation = useMutation({
    mutationFn: async ({ shouldHost }: { shouldHost: boolean }) => {
      if (shouldHost && gameQuizId && originalDraft?.revision) {
        return {
          game: null,
          session: await gameQuizApi.createSession(
            gameQuizId,
            originalDraft.revision
          ),
        };
      }

      const game = gameQuizId
        ? await gameQuizApi.saveQuestions(gameQuizId, draft)
        : await gameQuizApi.create(draft);
      return { game, session: null };
    },
    onSuccess: ({ game, session }) => {
      if (game) {
        const savedDraft = asDraft(game);
        setDraft(savedDraft);
        setOriginalDraft(asDraft(game));
        queryClient.setQueryData(['game-quiz', game.id], game);
        toast.success(copy.editor.saved);
      }
      if (session) {
        router.push(`/games/sessions/${session.id}/host`);
        return;
      }
      if (!gameQuizId && game) router.replace(`/games/${game.id}/edit`);
    },
    onError: (error) => {
      const code =
        error && typeof error === 'object' && 'code' in error
          ? error.code
          : undefined;
      toast.error(
        code === 'REVISION_CONFLICT' ? copy.editor.conflict : copy.common.error
      );
    },
  });

  const activeQuestion = draft.questions[activeQuestionIndex];
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

  const addQuestion = () => {
    setDraft((current) => ({
      ...current,
      questions: [
        ...current.questions,
        createQuestion(current.questions.length),
      ],
    }));
    setActiveQuestionIndex(draft.questions.length);
  };

  const removeQuestion = () => {
    if (draft.questions.length === 1) return;
    setDraft((current) => ({
      ...current,
      questions: current.questions
        .filter((_, index) => index !== activeQuestionIndex)
        .map((question, order) => ({ ...question, order })),
    }));
    setActiveQuestionIndex((index) => Math.max(0, index - 1));
  };

  if (gameQuizId && gameQuery.isPending) {
    return <EditorLoading copy={copy} />;
  }

  if (gameQuizId && gameQuery.isError) {
    return (
      <section
        className="border border-destructive/30 bg-destructive/5 p-6"
        role="alert"
      >
        <p className="text-destructive">{copy.common.error}</p>
        <Button
          className="mt-4"
          onClick={() => gameQuery.refetch()}
          variant="outline"
        >
          {copy.common.retry}
        </Button>
      </section>
    );
  }

  return (
    <main className="space-y-6 pb-10">
      <header className="flex flex-col gap-4 border-b pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-muted-foreground text-sm">
            {copy.editor.template}
          </p>
          <h1 className="mt-1 font-semibold text-3xl">{copy.editor.title}</h1>
          <p className="mt-2 text-muted-foreground">
            {copy.editor.description}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {gameQuizId ? (
            <>
              <Button
                disabled={isDirty || saveMutation.isPending}
                onClick={() => router.push(`/games/${gameQuizId}/preview`)}
                variant="outline"
              >
                <Play className="size-4" aria-hidden="true" />
                {copy.editor.preview}
              </Button>
              <Button
                disabled={!valid || !isDirty || saveMutation.isPending}
                onClick={() => saveMutation.mutate({ shouldHost: false })}
              >
                {saveMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                {copy.common.save}
              </Button>
              <Button
                disabled={
                  !valid ||
                  isDirty ||
                  !originalDraft?.revision ||
                  saveMutation.isPending
                }
                onClick={() => saveMutation.mutate({ shouldHost: true })}
                variant="secondary"
              >
                {copy.editor.host}
              </Button>
            </>
          ) : (
            <Button
              disabled={!valid || saveMutation.isPending}
              onClick={() => saveMutation.mutate({ shouldHost: false })}
            >
              {saveMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              {copy.editor.create}
            </Button>
          )}
        </div>
      </header>

      {!valid ? (
        <p
          className="border border-warning/30 bg-warning/10 px-4 py-3 text-sm"
          role="status"
        >
          {copy.editor.validation}
        </p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)_280px]">
        <aside className="border bg-card p-3 xl:sticky xl:top-0 xl:h-fit">
          <div className="mb-3 flex items-center justify-between px-2">
            <p className="font-medium text-sm">{copy.editor.question}</p>
            <Button
              aria-label={copy.editor.addQuestion}
              onClick={addQuestion}
              size="icon"
              variant="ghost"
            >
              <Plus className="size-4" aria-hidden="true" />
            </Button>
          </div>
          <div className="space-y-1">
            {draft.questions.map((question, index) => (
              <button
                className={`w-full border-l-2 px-3 py-3 text-left text-sm transition-colors ${
                  activeQuestionIndex === index
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-transparent text-muted-foreground hover:bg-muted'
                }`}
                key={question.id}
                onClick={() => setActiveQuestionIndex(index)}
                type="button"
              >
                <span className="mr-2 font-medium">{index + 1}</span>
                <span className="line-clamp-1">
                  {question.prompt || copy.editor.question}
                </span>
              </button>
            ))}
          </div>
          <Button
            className="mt-3 w-full"
            onClick={addQuestion}
            size="sm"
            variant="outline"
          >
            <Plus className="size-4" aria-hidden="true" />
            {copy.editor.addQuestion}
          </Button>
        </aside>

        <section className="space-y-5 border bg-card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <p className="font-medium text-sm">
              {copy.editor.question} {activeQuestionIndex + 1}
            </p>
            <Button
              disabled={draft.questions.length === 1}
              onClick={removeQuestion}
              size="sm"
              variant="ghost"
            >
              <Trash2 className="size-4" aria-hidden="true" />
              {copy.editor.removeQuestion}
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="game-question-prompt">{copy.editor.prompt}</Label>
            <Textarea
              id="game-question-prompt"
              onChange={(event) => updateQuestion('prompt', event.target.value)}
              placeholder={copy.editor.prompt}
              rows={3}
              value={activeQuestion.prompt}
            />
          </div>

          <fieldset className="space-y-3">
            <Label asChild>
              <legend>{copy.editor.answer}</legend>
            </Label>
            {activeQuestion.options.map((option, optionIndex) => (
              <div className="flex items-center gap-3" key={option.id}>
                <input
                  aria-label={`${copy.editor.correct}: ${optionIndex + 1}`}
                  checked={option.isCorrect}
                  className="size-4 accent-primary"
                  name={`correct-${activeQuestion.id}`}
                  onChange={() => markCorrect(optionIndex)}
                  type="radio"
                />
                <Input
                  aria-label={`${copy.editor.answer} ${optionIndex + 1}`}
                  onChange={(event) =>
                    updateOption(optionIndex, event.target.value)
                  }
                  placeholder={`${copy.editor.answer} ${optionIndex + 1}`}
                  value={option.text}
                />
                {activeQuestion.options.length > 2 ? (
                  <Button
                    aria-label={copy.editor.removeAnswer}
                    onClick={() => {
                      setDraft((current) => ({
                        ...current,
                        questions: current.questions.map(
                          (question, questionIndex) =>
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
                    }}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </Button>
                ) : null}
              </div>
            ))}
          </fieldset>
          {activeQuestion.options.length < 4 ? (
            <Button
              onClick={() => {
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
              }}
              size="sm"
              variant="outline"
            >
              <Plus className="size-4" aria-hidden="true" />
              {copy.editor.addAnswer}
            </Button>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="game-time-limit">{copy.editor.timeLimit}</Label>
              <Input
                id="game-time-limit"
                max={300}
                min={5}
                onChange={(event) =>
                  updateQuestion('timeLimitSeconds', Number(event.target.value))
                }
                type="number"
                value={activeQuestion.timeLimitSeconds}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="game-max-points">{copy.editor.maxPoints}</Label>
              <Input
                id="game-max-points"
                min={1}
                onChange={(event) =>
                  updateQuestion('maxPoints', Number(event.target.value))
                }
                type="number"
                value={activeQuestion.maxPoints}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="game-hint">{copy.editor.hint}</Label>
            <Input
              id="game-hint"
              onChange={(event) => updateQuestion('hint', event.target.value)}
              value={activeQuestion.hint ?? ''}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="game-explanation">{copy.editor.explanation}</Label>
            <Textarea
              id="game-explanation"
              onChange={(event) =>
                updateQuestion('explanation', event.target.value)
              }
              rows={3}
              value={activeQuestion.explanation ?? ''}
            />
          </div>

          <div className="flex justify-between border-t pt-5">
            <Button
              disabled={activeQuestionIndex === 0}
              onClick={() => setActiveQuestionIndex((index) => index - 1)}
              variant="outline"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
              {copy.common.back}
            </Button>
            <Button
              disabled={activeQuestionIndex === draft.questions.length - 1}
              onClick={() => setActiveQuestionIndex((index) => index + 1)}
              variant="outline"
            >
              {copy.preview.next}
              <ChevronRight className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </section>

        <aside className="space-y-5 border bg-card p-5 xl:sticky xl:top-0 xl:h-fit">
          <p className="font-medium text-sm">{copy.editor.details}</p>
          <div className="space-y-2">
            <Label htmlFor="game-title">{copy.editor.titleLabel}</Label>
            <Input
              id="game-title"
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              value={draft.title}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="game-topic">{copy.editor.topicLabel}</Label>
            <Input
              id="game-topic"
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  topic: event.target.value,
                }))
              }
              value={draft.topic}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="game-difficulty">
              {copy.editor.difficultyLabel}
            </Label>
            <select
              className="h-9 w-full border bg-background px-3 text-sm"
              id="game-difficulty"
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  difficulty: event.target.value as GameQuizDraft['difficulty'],
                }))
              }
              value={draft.difficulty}
            >
              <option value="EASY">{copy.editor.easy}</option>
              <option value="MEDIUM">{copy.editor.medium}</option>
              <option value="HARD">{copy.editor.hard}</option>
            </select>
          </div>
          <div className="space-y-4 border-t pt-5">
            <div>
              <p className="font-medium text-sm">{copy.editor.settings}</p>
            </div>
            <SettingToggle
              checked={draft.settings.randomizeQuestions}
              label={copy.editor.randomizeQuestions}
              onChange={(checked) =>
                setDraft((current) => ({
                  ...current,
                  settings: {
                    ...current.settings,
                    randomizeQuestions: checked,
                  },
                }))
              }
            />
            <SettingToggle
              checked={draft.settings.randomizeAnswers}
              label={copy.editor.randomizeAnswers}
              onChange={(checked) =>
                setDraft((current) => ({
                  ...current,
                  settings: { ...current.settings, randomizeAnswers: checked },
                }))
              }
            />
          </div>
        </aside>
      </div>
    </main>
  );
}

function EditorLoading({ copy }: { copy: GameQuizCopy }) {
  return (
    <div className="flex min-h-72 items-center justify-center text-muted-foreground">
      <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
      {copy.common.loading}
    </div>
  );
}

function SettingToggle({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-sm">
      <Checkbox
        checked={checked}
        onCheckedChange={(value) => onChange(value === true)}
      />
      <span>{label}</span>
    </label>
  );
}
