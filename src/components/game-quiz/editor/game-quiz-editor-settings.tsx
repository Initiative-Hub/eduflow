'use client';

import { BarChart3, Clock, Shuffle, Sparkles, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
import type { GameQuizCopy } from '../copy';
import type { GameQuizDraft } from '../types';

interface GameQuizEditorSettingsProps {
  copy: GameQuizCopy;
  draft: GameQuizDraft;
  onUpdateDraft: (updater: (prev: GameQuizDraft) => GameQuizDraft) => void;
}

export function GameQuizEditorSettings({
  copy,
  draft,
  onUpdateDraft,
}: GameQuizEditorSettingsProps) {
  const totalSeconds = draft.questions.reduce(
    (acc, q) => acc + (q.timeLimitSeconds || 0),
    0
  );
  const totalMinutes = Math.max(1, Math.round(totalSeconds / 60));
  const totalPoints = draft.questions.reduce(
    (acc, q) => acc + (q.maxPoints || 0),
    0
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      {/* Game Details Card */}
      <div className="space-y-4 rounded-2xl border bg-card p-4 shadow-xs">
        <div className="flex items-center gap-2 border-b pb-3">
          <Sparkles className="size-4 text-primary" aria-hidden="true" />
          <h3 className="font-bold text-foreground text-sm">
            {copy.editor.details}
          </h3>
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="game-title"
            className="font-semibold text-muted-foreground text-xs"
          >
            {copy.editor.titleLabel}
          </Label>
          <Input
            id="game-title"
            onChange={(event) =>
              onUpdateDraft((current) => ({
                ...current,
                title: event.target.value,
              }))
            }
            placeholder={copy.editor.titleLabel}
            value={draft.title}
            className="rounded-xl text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="game-topic"
            className="font-semibold text-muted-foreground text-xs"
          >
            {copy.editor.topicLabel}
          </Label>
          <Input
            id="game-topic"
            onChange={(event) =>
              onUpdateDraft((current) => ({
                ...current,
                topic: event.target.value,
              }))
            }
            placeholder={copy.editor.topicLabel}
            value={draft.topic}
            className="rounded-xl text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="game-difficulty"
            className="font-semibold text-muted-foreground text-xs"
          >
            {copy.editor.difficultyLabel}
          </Label>
          <Select
            value={draft.difficulty}
            onValueChange={(val) =>
              onUpdateDraft((current) => ({
                ...current,
                difficulty: val as GameQuizDraft['difficulty'],
              }))
            }
          >
            <SelectTrigger id="game-difficulty" className="rounded-xl text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem
                value="EASY"
                className="focus:bg-primary/20 focus:**:text-emerald-600!"
              >
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 text-xs dark:text-emerald-400"
                  >
                    {copy.editor.easy}
                  </Badge>
                </div>
              </SelectItem>
              <SelectItem
                value="MEDIUM"
                className="focus:bg-primary/20 focus:**:text-amber-600!"
              >
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="border-amber-500/30 bg-amber-500/10 text-amber-600 text-xs dark:text-amber-400"
                  >
                    {copy.editor.medium}
                  </Badge>
                </div>
              </SelectItem>
              <SelectItem
                value="HARD"
                className="focus:bg-primary/20 focus:**:text-rose-600!"
              >
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="border-rose-500/30 bg-rose-500/10 text-rose-600 text-xs dark:text-rose-400"
                  >
                    {copy.editor.hard}
                  </Badge>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-4">
        {/* Settings Card */}
        <div className="space-y-3 rounded-2xl border bg-card p-4 shadow-xs">
          <div className="flex items-center gap-2 border-b pb-3">
            <Shuffle className="size-4 text-primary" aria-hidden="true" />
            <h3 className="font-bold text-foreground text-sm">
              {copy.editor.settings}
            </h3>
          </div>

          <div className="space-y-3">
            <label className="group flex cursor-pointer select-none items-start gap-3 text-sm">
              <Checkbox
                checked={draft.settings.randomizeQuestions}
                onCheckedChange={(val) =>
                  onUpdateDraft((current) => ({
                    ...current,
                    settings: {
                      ...current.settings,
                      randomizeQuestions: val === true,
                    },
                  }))
                }
                className="mt-0.5"
              />
              <div>
                <span className="font-medium text-foreground text-xs transition-colors group-hover:text-primary">
                  {copy.editor.randomizeQuestions}
                </span>
              </div>
            </label>

            <label className="group flex cursor-pointer select-none items-start gap-3 text-sm">
              <Checkbox
                checked={draft.settings.randomizeAnswers}
                onCheckedChange={(val) =>
                  onUpdateDraft((current) => ({
                    ...current,
                    settings: {
                      ...current.settings,
                      randomizeAnswers: val === true,
                    },
                  }))
                }
                className="mt-0.5"
              />
              <div>
                <span className="font-medium text-foreground text-xs transition-colors group-hover:text-primary">
                  {copy.editor.randomizeAnswers}
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Rally Overview Stats Card */}
        <div className="rounded-2xl border bg-linear-to-br from-primary/5 via-card to-card p-4 shadow-xs">
          <div className="flex items-center gap-2 border-b pb-2.5">
            <BarChart3 className="size-4 text-primary" aria-hidden="true" />
            <h4 className="font-bold text-muted-foreground text-xs uppercase tracking-wider">
              {copy.editor.rallyOverview}
            </h4>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 text-center">
            <div className="rounded-xl border bg-background/80 p-2.5">
              <p className="flex items-center justify-center gap-1 font-medium text-[11px] text-muted-foreground">
                <Clock className="size-3" />
                {copy.editor.estimatedDuration}
              </p>
              <p className="mt-1 font-extrabold text-base text-foreground tabular-nums">
                ~{totalMinutes} min
              </p>
            </div>
            <div className="rounded-xl border bg-background/80 p-2.5">
              <p className="flex items-center justify-center gap-1 font-medium text-[11px] text-muted-foreground">
                <Trophy className="size-3 text-amber-500" />
                {copy.editor.totalPossiblePoints}
              </p>
              <p className="mt-1 font-extrabold text-base text-primary tabular-nums">
                {totalPoints.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
