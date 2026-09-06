'use client';

import { useMutation } from '@tanstack/react-query';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { Label } from '@/components/ui/label';
import { type GameQuizCopy, gameQuizCopy } from './copy';
import { requestLiveGameTicket } from './live-game-client';
import { activateLiveGameSession } from './live-game-session';

interface GameQuizJoinClientProps {
  copy?: GameQuizCopy;
}

export function GameQuizJoinClient({
  copy = gameQuizCopy,
}: GameQuizJoinClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState(
    () => searchParams.get('code')?.replace(/\D/g, '').slice(0, 6) ?? ''
  );
  const joinMutation = useMutation({
    mutationFn: () =>
      requestLiveGameTicket({ audience: 'PARTICIPANT', joinCode: code }),
    onSuccess: ({ roomId }) => {
      activateLiveGameSession({
        audience: 'PARTICIPANT',
        joinCode: code,
        sessionId: roomId,
        version: 3,
      });
      router.replace('/games/live/play');
    },
    onError: () => toast.error(copy.common.error),
  });

  return (
    <main className="mx-auto grid min-h-[calc(100vh-8rem)] max-w-md place-items-center px-4 py-8">
      <section className="w-full border bg-card p-6 sm:p-8">
        <p className="text-primary text-sm">{copy.editor.template}</p>
        <h1 className="mt-2 font-semibold text-3xl">{copy.join.title}</h1>
        <p className="mt-3 text-muted-foreground">{copy.join.description}</p>
        <form
          className="mt-8 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (code.length === 6) joinMutation.mutate();
          }}
        >
          <Label htmlFor="game-join-code">{copy.join.codeLabel}</Label>
          <InputOTP
            autoComplete="one-time-code"
            id="game-join-code"
            inputMode="numeric"
            maxLength={6}
            onChange={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
            value={code}
          >
            <InputOTPGroup className="mx-auto">
              {Array.from({ length: 6 }, (_, index) => (
                <InputOTPSlot
                  className="size-12 text-xl"
                  index={index}
                  key={index}
                />
              ))}
            </InputOTPGroup>
          </InputOTP>
          <p className="text-muted-foreground text-xs">{copy.join.codeHint}</p>
          <Button
            className="mt-4 w-full"
            disabled={code.length !== 6 || joinMutation.isPending}
            type="submit"
          >
            {joinMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ArrowRight className="size-4" />
            )}
            {joinMutation.isPending ? copy.join.joining : copy.join.join}
          </Button>
        </form>
      </section>
    </main>
  );
}
