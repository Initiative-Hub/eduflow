'use client';

import { useQuery } from '@tanstack/react-query';
import { BarChart3, Loader2, Users } from 'lucide-react';
import { gameQuizApi } from './api';
import { type GameQuizCopy, gameQuizCopy } from './copy';
import { GameSessionError } from './game-quiz-host-client';

interface GameQuizReportClientProps {
  sessionId: string;
  copy?: GameQuizCopy;
}

export function GameQuizReportClient({
  sessionId,
  copy = gameQuizCopy,
}: GameQuizReportClientProps) {
  const reportQuery = useQuery({
    queryKey: ['game-session-report', sessionId],
    queryFn: () => gameQuizApi.report(sessionId),
  });

  if (reportQuery.isPending) {
    return (
      <div className="flex min-h-72 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
        {copy.common.loading}
      </div>
    );
  }
  if (reportQuery.isError || !reportQuery.data)
    return (
      <GameSessionError copy={copy} onRetry={() => reportQuery.refetch()} />
    );

  const report = reportQuery.data;
  return (
    <main className="space-y-6 pb-10">
      <header className="border-b pb-5">
        <p className="text-primary text-sm">{report.session.gameTitle}</p>
        <h1 className="mt-1 font-semibold text-3xl">{copy.report.title}</h1>
        <p className="mt-2 text-muted-foreground">{copy.report.description}</p>
      </header>
      <div className="grid gap-px border bg-border sm:grid-cols-2">
        <ReportMetric
          icon={Users}
          label={copy.report.players}
          value={String(report.participants.length)}
        />
        <ReportMetric
          icon={BarChart3}
          label={copy.report.questions}
          value={String(report.rounds.length)}
        />
      </div>
      {report.rounds.length === 0 ? (
        <p className="border border-dashed p-8 text-center text-muted-foreground">
          {copy.report.noData}
        </p>
      ) : (
        <section className="overflow-x-auto border bg-card">
          <table className="w-full min-w-150 text-left text-sm">
            <thead className="border-b bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">
                  {copy.editor.question}
                </th>
                <th className="px-4 py-3 font-medium">
                  {copy.report.responses}
                </th>
                <th className="px-4 py-3 font-medium">{copy.report.correct}</th>
                <th className="px-4 py-3 font-medium">
                  {copy.report.averagePoints}
                </th>
              </tr>
            </thead>
            <tbody>
              {report.rounds.map((round) => (
                <tr className="border-b last:border-0" key={round.id}>
                  <td className="max-w-xl px-4 py-4">
                    <span className="mr-2 text-muted-foreground">
                      {round.order + 1}
                    </span>
                    {round.prompt}
                  </td>
                  <td className="px-4 py-4 tabular-nums">
                    {round.responseCount}
                  </td>
                  <td className="px-4 py-4 tabular-nums">
                    {round.correctCount}
                  </td>
                  <td className="px-4 py-4 tabular-nums">
                    {Math.round(round.averagePoints)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
      <section className="border bg-card p-5">
        <h2 className="font-semibold">{copy.report.finalStandings}</h2>
        <ol className="mt-4 grid gap-2 md:grid-cols-2">
          {report.participants.map((participant, index) => (
            <li
              className="flex items-center justify-between border p-3 text-sm"
              key={participant.id}
            >
              <span>
                {index + 1}. {participant.displayName}
              </span>
              <span className="font-medium tabular-nums">
                {participant.score}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}

function ReportMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 bg-card p-5">
      <span className="grid size-9 place-items-center bg-primary/10 text-primary">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div>
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="font-semibold text-2xl tabular-nums">{value}</p>
      </div>
    </div>
  );
}
