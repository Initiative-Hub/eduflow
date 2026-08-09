'use client';

import { useQuery } from '@tanstack/react-query';
import { Gamepad2, Loader2, Pencil, Plus, Sparkles } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { gameQuizApi } from './api';
import { type GameQuizCopy, gameQuizCopy } from './copy';

interface GameQuizLibraryClientProps {
  copy?: GameQuizCopy;
}

function formatUpdated(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

export function GameQuizLibraryClient({
  copy = gameQuizCopy,
}: GameQuizLibraryClientProps) {
  const gamesQuery = useQuery({
    queryKey: ['game-quizzes'],
    queryFn: gameQuizApi.list,
  });

  if (gamesQuery.isPending) {
    return (
      <div className="flex min-h-72 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
        {copy.common.loading}
      </div>
    );
  }

  if (gamesQuery.isError) {
    return (
      <section
        className="border border-destructive/30 bg-destructive/5 p-6"
        aria-live="polite"
      >
        <p className="font-medium text-destructive">{copy.common.error}</p>
        <Button
          className="mt-4"
          onClick={() => gamesQuery.refetch()}
          variant="outline"
        >
          {copy.common.retry}
        </Button>
      </section>
    );
  }

  const games = gamesQuery.data;
  return (
    <main className="space-y-8">
      <header className="flex flex-col gap-5 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <div className="mb-3 flex items-center gap-2 text-primary text-sm">
            <Gamepad2 className="size-4" aria-hidden="true" />
            <span>{copy.library.liveRally}</span>
          </div>
          <h1 className="font-semibold text-3xl tracking-normal">
            {copy.library.title}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {copy.library.description}
          </p>
        </div>
        <Button asChild>
          <Link href="/games/create">
            <Plus className="size-4" aria-hidden="true" />
            {copy.library.create}
          </Link>
        </Button>
      </header>

      {games.length === 0 ? (
        <section className="grid min-h-80 place-items-center border border-dashed p-8 text-center">
          <div className="max-w-sm">
            <Image
              alt=""
              className="mb-6 aspect-video w-full border object-cover"
              height={720}
              priority
              src="/images/game-quiz/learning-rally-stage.png"
              width={1280}
            />
            <span className="mx-auto flex size-12 items-center justify-center bg-primary/10 text-primary">
              <Sparkles className="size-5" aria-hidden="true" />
            </span>
            <h2 className="mt-4 font-semibold text-xl">
              {copy.library.emptyTitle}
            </h2>
            <p className="mt-2 text-muted-foreground text-sm">
              {copy.library.emptyDescription}
            </p>
            <Button asChild className="mt-6">
              <Link href="/games/create">
                <Plus className="size-4" aria-hidden="true" />
                {copy.library.create}
              </Link>
            </Button>
          </div>
        </section>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {games.map((game) => (
            <article key={game.id} className="border bg-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-muted-foreground text-xs uppercase">
                    {game.topic || copy.library.liveRally}
                  </p>
                  <h2 className="mt-1 font-semibold text-xl">{game.title}</h2>
                </div>
                <span className="border px-2 py-1 text-muted-foreground text-xs">
                  {game.difficulty}
                </span>
              </div>
              <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-muted-foreground text-sm">
                <span>
                  {game.questionCount || game.questions?.length || 0}{' '}
                  {copy.library.questions}
                </span>
                <span>
                  {copy.library.updated} {formatUpdated(game.updatedAt)}
                </span>
              </div>
              <div className="mt-5 flex gap-2 border-t pt-4">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/games/${game.id}/edit`}>
                    <Pencil className="size-4" aria-hidden="true" />
                    {copy.library.edit}
                  </Link>
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
