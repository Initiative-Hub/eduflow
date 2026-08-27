'use client';

import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MonitorUp,
  RotateCcw,
  Smartphone,
} from 'lucide-react';
import Link from 'next/link';
import { type ReactNode, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { gameQuizApi } from './api';
import { type GameQuizCopy, gameQuizCopy } from './copy';
import {
  GameQuizHostScoreboard,
  GameQuizPlayerScoreboard,
} from './game-quiz-scoreboard-stage';
import {
  type GameQuizPreviewDevice,
  GameQuizPreviewQuestionStage,
} from './preview/game-quiz-preview-question-stage';
import {
  createGameQuizPreviewSession,
  type PreviewParticipantRank,
} from './preview/game-quiz-preview-session';

interface GameQuizPreviewClientProps {
  gameQuizId: string;
  copy?: GameQuizCopy;
}

type PreviewStage = 'question' | 'reveal' | 'rankings';

function PreviewToggle({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <Button
      aria-pressed={active}
      className="rounded-xl"
      onClick={onClick}
      size="sm"
      variant={active ? 'secondary' : 'ghost'}
    >
      {children}
    </Button>
  );
}

export function GameQuizPreviewClient({
  gameQuizId,
  copy = gameQuizCopy,
}: GameQuizPreviewClientProps) {
  const gameQuery = useQuery({
    queryKey: ['game-quiz', gameQuizId],
    queryFn: () => gameQuizApi.get(gameQuizId),
  });
  const [device, setDevice] = useState<GameQuizPreviewDevice>('participant');
  const [stage, setStage] = useState<PreviewStage>('question');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [participantRank, setParticipantRank] =
    useState<PreviewParticipantRank>(4);
  const [selectedOptionId, setSelectedOptionId] = useState<string>();

  if (gameQuery.isPending) {
    return (
      <div className="flex min-h-72 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
        {copy.common.loading}
      </div>
    );
  }
  if (gameQuery.isError || !gameQuery.data) {
    return <p className="text-destructive">{copy.common.error}</p>;
  }

  const gameQuiz = gameQuery.data;
  const questions = gameQuiz.questions ?? [];
  const question = questions[questionIndex];
  if (!question) {
    return <p className="text-muted-foreground">{copy.library.noQuestions}</p>;
  }

  const moveToQuestion = (nextIndex: number) => {
    setQuestionIndex(nextIndex);
    setSelectedOptionId(undefined);
    setStage('question');
  };
  const resetQuestion = () => {
    setSelectedOptionId(undefined);
    setStage('question');
  };
  const previewSession = createGameQuizPreviewSession({
    gameQuizId,
    gameTitle: gameQuiz.title,
    participantName: copy.preview.samplePlayer,
    participantRank,
    question,
    questionIndex,
    totalRounds: questions.length,
  });
  const isRankings = stage === 'rankings';

  return (
    <main className="min-h-[calc(100vh-6rem)] bg-muted/30 px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <header className="flex items-start gap-3">
          <Button asChild size="icon" variant="ghost">
            <Link
              aria-label={copy.preview.backToEditor}
              href={`/games/${gameQuizId}/edit`}
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
            </Link>
          </Button>
          <div>
            <p className="font-medium text-muted-foreground text-sm">
              {gameQuiz.title}
            </p>
            <h1 className="mt-1 font-bold text-2xl tracking-tight sm:text-3xl">
              {copy.preview.title}
            </h1>
          </div>
        </header>

        <section
          aria-label={copy.preview.title}
          className="flex flex-col gap-3 rounded-2xl border bg-background p-2 shadow-sm xl:flex-row xl:items-center xl:justify-between"
        >
          <div className="flex flex-wrap gap-1" role="group">
            <PreviewToggle
              active={stage === 'question'}
              onClick={() => setStage('question')}
            >
              {copy.preview.question}
            </PreviewToggle>
            <PreviewToggle
              active={stage === 'reveal'}
              onClick={() => setStage('reveal')}
            >
              {copy.preview.reveal}
            </PreviewToggle>
            <PreviewToggle
              active={stage === 'rankings'}
              onClick={() => setStage('rankings')}
            >
              {copy.player.leaderboard}
            </PreviewToggle>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isRankings && device === 'participant' ? (
              <div
                aria-label={copy.player.rank}
                className="flex gap-1 rounded-xl bg-muted p-1"
                role="group"
              >
                <PreviewToggle
                  active={participantRank === 1}
                  onClick={() => setParticipantRank(1)}
                >
                  {copy.player.rank} 1
                </PreviewToggle>
                <PreviewToggle
                  active={participantRank === 4}
                  onClick={() => setParticipantRank(4)}
                >
                  {copy.player.rank} 4
                </PreviewToggle>
              </div>
            ) : null}
            <div
              aria-label={copy.preview.deviceView}
              className="flex gap-1 rounded-xl bg-muted p-1"
              role="group"
            >
              <PreviewToggle
                active={device === 'host'}
                onClick={() => setDevice('host')}
              >
                <MonitorUp className="size-4" aria-hidden="true" />
                {copy.preview.host}
              </PreviewToggle>
              <PreviewToggle
                active={device === 'participant'}
                onClick={() => setDevice('participant')}
              >
                <Smartphone className="size-4" aria-hidden="true" />
                {copy.preview.participant}
              </PreviewToggle>
            </div>
          </div>
        </section>

        <div
          className={cn(
            'mx-auto w-full',
            device === 'participant' && 'max-w-md'
          )}
        >
          {isRankings ? (
            <section
              aria-label={
                device === 'host' ? copy.preview.host : copy.preview.participant
              }
              className={cn(
                'overflow-hidden bg-background',
                device === 'host'
                  ? 'rounded-2xl border p-5 shadow-lg sm:p-8'
                  : 'rounded-[2rem] border-[6px] border-foreground/80 p-4 shadow-2xl sm:p-5'
              )}
            >
              {device === 'host' ? (
                <GameQuizHostScoreboard
                  copy={copy}
                  isPending={false}
                  onNext={() =>
                    moveToQuestion(
                      Math.min(questionIndex + 1, questions.length - 1)
                    )
                  }
                  session={previewSession}
                />
              ) : (
                <GameQuizPlayerScoreboard
                  copy={copy}
                  session={previewSession}
                />
              )}
            </section>
          ) : (
            <GameQuizPreviewQuestionStage
              copy={copy}
              device={device}
              onSelectOption={setSelectedOptionId}
              question={question}
              questionIndex={questionIndex}
              revealed={stage === 'reveal'}
              selectedOptionId={selectedOptionId}
              totalQuestions={questions.length}
            />
          )}
        </div>

        {!isRankings ? (
          <footer className="flex flex-col gap-3 rounded-2xl border bg-background p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <Button onClick={resetQuestion} variant="outline">
              <RotateCcw className="size-4" aria-hidden="true" />
              {copy.preview.reset}
            </Button>
            <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-end">
              <Button
                disabled={questionIndex === 0}
                onClick={() => moveToQuestion(questionIndex - 1)}
                variant="outline"
              >
                <ChevronLeft className="size-4" aria-hidden="true" />
                {copy.preview.previous}
              </Button>
              <span className="min-w-24 text-center font-medium text-sm">
                {copy.preview.question} {questionIndex + 1}/{questions.length}
              </span>
              <Button
                disabled={questionIndex === questions.length - 1}
                onClick={() => moveToQuestion(questionIndex + 1)}
                variant="outline"
              >
                {copy.preview.next}
                <ChevronRight className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </footer>
        ) : null}
      </div>
    </main>
  );
}
