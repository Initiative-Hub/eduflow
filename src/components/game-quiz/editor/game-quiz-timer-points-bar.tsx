'use client';

import { Award, Timer } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { GameQuizCopy } from '../copy';

const TIME_PRESETS = [10, 20, 30, 60, 90] as const;
const POINT_PRESETS = [500, 1000, 2000] as const;

interface GameQuizTimerPointsBarProps {
  copy: GameQuizCopy;
  maxPoints: number;
  onMaxPointsChange: (points: number) => void;
  onTimeLimitChange: (seconds: number) => void;
  timeLimitSeconds: number;
}

export function GameQuizTimerPointsBar({
  copy,
  maxPoints,
  onMaxPointsChange,
  onTimeLimitChange,
  timeLimitSeconds,
}: GameQuizTimerPointsBarProps) {
  return (
    <div className="grid gap-4 rounded-xl border bg-muted/20 p-4 sm:grid-cols-2">
      {/* Time Limit Section */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <Label
            htmlFor="game-time-limit"
            className="flex items-center gap-1.5 font-semibold text-muted-foreground text-xs uppercase tracking-wider"
          >
            <Timer className="size-3.5 text-primary" aria-hidden="true" />
            {copy.editor.timeLimit}
          </Label>
          <span className="font-bold text-foreground text-xs tabular-nums">
            {timeLimitSeconds}s
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {TIME_PRESETS.map((seconds) => (
            <button
              key={seconds}
              type="button"
              onClick={() => onTimeLimitChange(seconds)}
              className={cn(
                'cursor-pointer rounded-lg px-2.5 py-1 font-semibold text-xs tabular-nums transition-all',
                timeLimitSeconds === seconds
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground'
              )}
            >
              {seconds}s
            </button>
          ))}
          <div className="w-16">
            <Input
              id="game-time-limit"
              type="number"
              min={5}
              max={300}
              value={timeLimitSeconds}
              onChange={(e) => onTimeLimitChange(Number(e.target.value))}
              className="h-7 px-2 font-bold text-xs tabular-nums"
              aria-label={copy.editor.timeLimit}
            />
          </div>
        </div>
      </div>

      {/* Max Points Section */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <Label
            htmlFor="game-max-points"
            className="flex items-center gap-1.5 font-semibold text-muted-foreground text-xs uppercase tracking-wider"
          >
            <Award className="size-3.5 text-amber-500" aria-hidden="true" />
            {copy.editor.maxPoints}
          </Label>
          <span className="font-bold text-foreground text-xs tabular-nums">
            {maxPoints.toLocaleString()} {copy.player.pts}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {POINT_PRESETS.map((pts) => (
            <button
              key={pts}
              type="button"
              onClick={() => onMaxPointsChange(pts)}
              className={cn(
                'cursor-pointer rounded-lg px-2.5 py-1 font-semibold text-xs tabular-nums transition-all',
                maxPoints === pts
                  ? 'bg-amber-500 font-bold text-amber-950 shadow-xs'
                  : 'border bg-background text-muted-foreground hover:border-amber-500/50 hover:text-foreground'
              )}
            >
              {pts.toLocaleString()}
            </button>
          ))}
          <div className="w-20">
            <Input
              id="game-max-points"
              type="number"
              min={1}
              value={maxPoints}
              onChange={(e) => onMaxPointsChange(Number(e.target.value))}
              className="h-7 px-2 font-bold text-xs tabular-nums"
              aria-label={copy.editor.maxPoints}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
