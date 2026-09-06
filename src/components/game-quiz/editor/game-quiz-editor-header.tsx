'use client';

import {
  CheckCircle2,
  CircleDot,
  Loader2,
  Play,
  Plus,
  Save,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { GameQuizCopy } from '../copy';

interface GameQuizEditorHeaderProps {
  copy: GameQuizCopy;
  gameQuizId?: string;
  isCreatePending: boolean;
  isDirty: boolean;
  isHostPending: boolean;
  isSavePending: boolean;
  isValid: boolean;
  onBrowsePreview: () => void;
  onCreateGame: () => void;
  onHostGame: () => void;
  onSaveDraft: () => void;
}

export function GameQuizEditorHeader({
  copy,
  gameQuizId,
  isCreatePending,
  isDirty,
  isHostPending,
  isSavePending,
  isValid,
  onBrowsePreview,
  onCreateGame,
  onHostGame,
  onSaveDraft,
}: GameQuizEditorHeaderProps) {
  return (
    <header className="flex flex-col gap-4 border-b pb-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex items-start gap-3.5">
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-primary/20 via-primary/10 to-primary/5 text-primary shadow-xs ring-1 ring-primary/20">
          <Sparkles className="size-5" aria-hidden="true" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-primary text-xs uppercase tracking-wider">
              {copy.editor.template}
            </span>
            {gameQuizId ? (
              isDirty ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 font-medium text-[11px] text-amber-700 dark:text-amber-400">
                  <CircleDot className="size-2.5 animate-pulse" />
                  {copy.editor.unsavedChanges}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 font-medium text-[11px] text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="size-2.5" />
                  {copy.editor.allSaved}
                </span>
              )
            ) : null}
          </div>
          <h1 className="mt-0.5 font-bold text-2xl text-foreground tracking-tight sm:text-3xl">
            {copy.editor.title}
          </h1>
          <p className="mt-1 text-muted-foreground text-sm">
            {copy.editor.description}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {gameQuizId ? (
          <>
            <Button
              type="button"
              disabled={isDirty || isSavePending || isHostPending}
              onClick={onBrowsePreview}
              variant="outline"
              className="rounded-xl shadow-xs"
            >
              <Play className="size-4" aria-hidden="true" />
              {copy.editor.preview}
            </Button>
            <Button
              type="button"
              disabled={!isValid || !isDirty || isSavePending || isHostPending}
              onClick={onSaveDraft}
              className="rounded-xl shadow-xs"
            >
              {isSavePending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {copy.common.save}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={!isValid || isDirty || isHostPending || isSavePending}
              onClick={onHostGame}
              className="rounded-xl font-bold shadow-xs"
            >
              {isHostPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Zap className="size-4" />
              )}
              {copy.editor.host}
            </Button>
          </>
        ) : (
          <Button
            type="button"
            disabled={!isValid || isCreatePending}
            onClick={onCreateGame}
            className="rounded-xl shadow-xs"
          >
            {isCreatePending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            {copy.editor.create}
          </Button>
        )}
      </div>
    </header>
  );
}
