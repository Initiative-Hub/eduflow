'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Clock3, Loader2, Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { gameQuizApi } from './api';
import { type GameQuizCopy, gameQuizCopy } from './copy';
import { GameSessionError, GameSessionLoading } from './game-quiz-host-client';
import type { GameSessionSnapshot } from './types';
import { useGameQuizRealtime } from './use-game-quiz-realtime';

interface GameQuizPlayerClientProps {
  sessionId: string;
  copy?: GameQuizCopy;
}

export function GameQuizPlayerClient({
  sessionId,
  copy = gameQuizCopy,
}: GameQuizPlayerClientProps) {
  const queryClient = useQueryClient();
  const sessionQuery = useQuery({
    queryKey: ['game-session', sessionId, 'player'],
    queryFn: () => gameQuizApi.getSession(sessionId),
    refetchInterval: 2000,
  });
  useGameQuizRealtime({
    sessionId,
    audience: 'PARTICIPANT',
    participantId: sessionQuery.data?.participant?.id,
  });
  const answerMutation = useMutation({
    mutationFn: (optionId: string) => {
      const roundId = sessionQuery.data?.currentRound?.id;
      if (!roundId) throw new Error('Round unavailable');
      return gameQuizApi.submitAnswer(
        sessionId,
        roundId,
        optionId,
        crypto.randomUUID()
      );
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ['game-session', sessionId, 'player'],
      }),
    onError: () => toast.error(copy.common.error),
  });
  const presenceMutation = useMutation({
    mutationFn: () => gameQuizApi.heartbeat(sessionId),
  });
  const { mutate: sendPresence } = presenceMutation;

  useEffect(() => {
    sendPresence();
    const interval = window.setInterval(sendPresence, 25_000);
    return () => window.clearInterval(interval);
  }, [sendPresence]);

  if (sessionQuery.isPending) return <GameSessionLoading copy={copy} />;
  if (sessionQuery.isError || !sessionQuery.data)
    return (
      <GameSessionError copy={copy} onRetry={() => sessionQuery.refetch()} />
    );

  const session = sessionQuery.data;
  if (session.phase === 'LOBBY')
    return <WaitingPanel copy={copy} session={session} />;
  if (
    session.phase === 'FINAL_CELEBRATION' ||
    session.phase === 'REPORT' ||
    session.phase === 'ENDED'
  )
    return <FinishedPanel copy={copy} session={session} />;
  if (!session.currentRound)
    return <WaitingPanel copy={copy} session={session} />;

  const isOpen = session.phase === 'QUESTION_OPEN';
  const submitted = Boolean(session.myAnswer);
  return (
    <main className="mx-auto max-w-3xl space-y-6 py-4 sm:py-10">
      <header className="flex items-center justify-between border-b pb-4 text-muted-foreground text-sm">
        <span className="font-medium text-foreground">{session.gameTitle}</span>
        <span>
          {copy.player.question} {session.currentRoundIndex + 1}/
          {session.totalRounds}
        </span>
      </header>
      <QuestionTimer copy={copy} deadlineAt={session.currentRound.deadlineAt} />
      <section className="relative overflow-hidden border bg-card p-5 sm:p-8">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[url('/images/game-quiz/learning-rally-stage.png')] bg-cover bg-center opacity-10"
        />
        <div className="relative">
          <h1 className="font-semibold text-2xl leading-tight sm:text-3xl">
            {session.currentRound.prompt}
          </h1>
          {session.currentRound.hint ? (
            <p className="mt-5 border-primary border-l-2 pl-3 text-muted-foreground text-sm">
              <span className="font-medium text-foreground">
                {copy.player.hint}
              </span>
              : {session.currentRound.hint}
            </p>
          ) : null}
          {isOpen && !submitted ? (
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {session.currentRound.options.map((option) => (
                <button
                  className="min-h-24 border bg-background p-5 text-left font-medium transition-colors hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={answerMutation.isPending}
                  key={option.id}
                  onClick={() => answerMutation.mutate(option.id)}
                  type="button"
                >
                  {option.text}
                </button>
              ))}
            </div>
          ) : null}
          {submitted && session.phase !== 'REVEAL' ? (
            <SubmittedPanel copy={copy} />
          ) : null}
          {session.phase === 'ANSWER_LOCKED' && !submitted ? (
            <SubmittedPanel copy={copy} locked />
          ) : null}
          {session.phase === 'REVEAL' ? (
            <RevealPanel copy={copy} session={session} />
          ) : null}
        </div>
      </section>
      {session.leaderboardEnabled && session.phase === 'REVEAL' ? (
        <Leaderboard copy={copy} session={session} />
      ) : null}
    </main>
  );
}

function QuestionTimer({
  copy,
  deadlineAt,
}: {
  copy: GameQuizCopy;
  deadlineAt?: string | null;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, []);
  if (!deadlineAt) return null;
  const seconds = Math.max(
    0,
    Math.ceil((new Date(deadlineAt).getTime() - now) / 1000)
  );
  return (
    <div className="flex items-center justify-between border bg-card px-4 py-3">
      <span className="flex items-center gap-2 text-muted-foreground text-sm">
        <Clock3 className="size-4" aria-hidden="true" />
        {copy.editor.timeLimit}
      </span>
      <span className="font-semibold text-xl tabular-nums">{seconds}</span>
    </div>
  );
}

function WaitingPanel({
  copy,
  session,
}: {
  copy: GameQuizCopy;
  session: GameSessionSnapshot;
}) {
  return (
    <main className="mx-auto grid min-h-[60vh] max-w-xl place-items-center py-8 text-center">
      <div>
        <span className="mx-auto grid size-14 place-items-center bg-primary/10 text-primary">
          <Loader2 className="size-6 animate-spin" aria-hidden="true" />
        </span>
        <h1 className="mt-5 font-semibold text-3xl">{copy.player.waiting}</h1>
        <p className="mt-2 text-muted-foreground">
          {copy.player.waitingDescription}
        </p>
        <p className="mt-6 text-muted-foreground text-sm">
          {session.gameTitle}
        </p>
      </div>
    </main>
  );
}

function SubmittedPanel({
  copy,
  locked = false,
}: {
  copy: GameQuizCopy;
  locked?: boolean;
}) {
  return (
    <div className="mt-8 border border-primary/20 bg-primary/5 p-6 text-center">
      <Check className="mx-auto size-7 text-primary" aria-hidden="true" />
      <h2 className="mt-3 font-semibold text-xl">
        {locked ? copy.player.locked : copy.player.submitted}
      </h2>
      <p className="mt-1 text-muted-foreground text-sm">
        {copy.player.submittedDescription}
      </p>
    </div>
  );
}

function RevealPanel({
  copy,
  session,
}: {
  copy: GameQuizCopy;
  session: GameSessionSnapshot;
}) {
  const answer = session.myAnswer;
  const correct = answer?.isCorrect === true;
  const correctOption = session.currentRound?.options.find(
    (option) => option.isCorrect
  );
  return (
    <div className="mt-8 space-y-5">
      <div
        className={`border p-5 ${correct ? 'border-success bg-success/10' : 'border-muted-foreground/20 bg-muted/40'}`}
      >
        <p className="text-muted-foreground text-sm">{copy.player.reveal}</p>
        <h2 className="mt-1 font-semibold text-xl">
          {correct ? copy.player.correct : copy.player.notCorrect}
        </h2>
        {correctOption ? (
          <p className="mt-3 text-sm">{correctOption.text}</p>
        ) : null}
        {answer ? (
          <p className="mt-4 font-medium text-sm">
            {answer.pointsAwarded ?? 0} {copy.player.points}
          </p>
        ) : null}
      </div>
      {session.currentRound?.explanation ? (
        <div className="border-primary border-l-2 pl-4">
          <p className="font-medium text-sm">{copy.editor.explanation}</p>
          <p className="mt-1 text-muted-foreground text-sm">
            {session.currentRound.explanation}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function FinishedPanel({
  copy,
  session,
}: {
  copy: GameQuizCopy;
  session: GameSessionSnapshot;
}) {
  return (
    <main className="mx-auto grid min-h-[60vh] max-w-xl place-items-center py-8 text-center">
      <div>
        <span className="mx-auto grid size-14 place-items-center bg-primary/10 text-primary">
          <Trophy className="size-7" aria-hidden="true" />
        </span>
        <h1 className="mt-5 font-semibold text-3xl">
          {copy.player.finishTitle}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {copy.player.finishDescription}
        </p>
        <p className="mt-6 font-semibold text-2xl">
          {session.participant?.score ?? 0}
        </p>
        <p className="text-muted-foreground text-sm">{copy.player.score}</p>
      </div>
    </main>
  );
}

function Leaderboard({
  copy,
  session,
}: {
  copy: GameQuizCopy;
  session: GameSessionSnapshot;
}) {
  return (
    <section className="border bg-card p-5">
      <h2 className="font-semibold">{copy.player.leaderboard}</h2>
      <ol className="mt-4 space-y-2">
        {session.leaderboard.map((participant, index) => (
          <li
            className="flex items-center justify-between border-b pb-2 text-sm last:border-0"
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
  );
}
