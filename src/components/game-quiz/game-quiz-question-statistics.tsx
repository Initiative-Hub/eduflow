import { CheckCircle2, Timer, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import type { GameQuizCopy } from './copy';
import type { GameSessionSnapshot } from './types';

function Statistic({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-center justify-center gap-2 px-2 py-3 sm:gap-3 sm:px-5 sm:py-4">
      <span
        className="hidden size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary sm:grid"
        aria-hidden="true"
      >
        {icon}
      </span>
      <div className="min-w-0 text-center sm:text-left">
        <dt className="text-pretty font-medium text-[0.6875rem] text-muted-foreground leading-tight sm:text-xs">
          {label}
        </dt>
        <dd className="mt-1 font-black font-heading text-foreground text-xl tabular-nums sm:text-2xl">
          {value}
        </dd>
      </div>
    </div>
  );
}

export function GameQuizQuestionStatistics({
  copy,
  session,
}: {
  copy: GameQuizCopy;
  session: GameSessionSnapshot;
}) {
  const statistics = session.currentRound?.statistics;
  if (!statistics) return null;

  const correctRate =
    statistics.responseCount > 0
      ? `${Math.round(
          (statistics.correctCount / statistics.responseCount) * 100
        )}%`
      : '–';
  const averageTime =
    statistics.averageResponseTimeMs === null
      ? '–'
      : `${(statistics.averageResponseTimeMs / 1000).toFixed(1)} s`;

  return (
    <dl
      aria-label={copy.host.questionStatistics}
      className="mx-auto mt-6 grid w-full max-w-3xl grid-cols-3 divide-x overflow-hidden rounded-2xl border bg-card shadow-sm"
    >
      <Statistic
        icon={<CheckCircle2 className="size-4" />}
        label={copy.host.correctRate}
        value={correctRate}
      />
      <Statistic
        icon={<Users className="size-4" />}
        label={copy.host.responses}
        value={`${statistics.responseCount} / ${session.participants.length}`}
      />
      <Statistic
        icon={<Timer className="size-4" />}
        label={copy.host.averageResponseTime}
        value={averageTime}
      />
    </dl>
  );
}
