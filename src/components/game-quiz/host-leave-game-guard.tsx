'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  ConfirmDialog,
  type ConfirmDialogControls,
} from '@/components/custom/dialog';
import type { GameQuizCopy } from './copy';
import { leaveLiveGameSession } from './live-game-client';
import { clearLiveGameSession } from './live-game-session';

type HostLeaveGameGuardProps = {
  copy: GameQuizCopy;
  disconnect: () => void;
  gameQuizId: string;
  isActive: boolean;
  sessionId: string;
};

const shouldGuardAnchor = (anchor: HTMLAnchorElement) => {
  if (anchor.target && anchor.target !== '_self') return false;
  if (anchor.hasAttribute('download')) return false;
  const destination = new URL(anchor.href, window.location.href);
  const current = new URL(window.location.href);
  return !(
    destination.origin === current.origin &&
    destination.pathname === current.pathname &&
    destination.search === current.search &&
    destination.hash !== current.hash
  );
};

export function HostLeaveGameGuard({
  copy,
  disconnect,
  gameQuizId,
  isActive,
  sessionId,
}: HostLeaveGameGuardProps) {
  const router = useRouter();
  const leaving = useRef(false);
  const [destination, setDestination] = useState<string | null>(null);
  const leaveMutation = useMutation({
    mutationFn: () => leaveLiveGameSession({ gameQuizId, sessionId }),
  });

  const leavePath = `/api/v1/game-quizzes/${encodeURIComponent(gameQuizId)}/sessions/${encodeURIComponent(sessionId)}/leave`;

  useEffect(() => {
    if (!isActive) return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (leaving.current) return;
      event.preventDefault();
      event.returnValue = '';
    };
    const onPageHide = () => {
      if (leaving.current) return;
      leaving.current = true;
      clearLiveGameSession('HOST', sessionId);
      navigator.sendBeacon(
        leavePath,
        new Blob(['{}'], { type: 'application/json' })
      );
    };
    const onDocumentClick = (event: MouseEvent) => {
      if (
        leaving.current ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        !(event.target instanceof Element)
      ) {
        return;
      }
      const anchor = event.target.closest('a[href]');
      if (!(anchor instanceof HTMLAnchorElement) || !shouldGuardAnchor(anchor))
        return;

      event.preventDefault();
      setDestination(anchor.href);
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    window.addEventListener('pagehide', onPageHide);
    document.addEventListener('click', onDocumentClick, true);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('pagehide', onPageHide);
      document.removeEventListener('click', onDocumentClick, true);
    };
  }, [isActive, leavePath, sessionId]);

  const continueToDestination = useCallback(
    (nextDestination: string) => {
      const url = new URL(nextDestination, window.location.href);
      if (url.origin === window.location.origin) {
        router.push(`${url.pathname}${url.search}${url.hash}`);
      } else {
        window.location.assign(url.href);
      }
    },
    [router]
  );

  const confirmLeave = async ({ close }: ConfirmDialogControls) => {
    if (!destination) return;
    try {
      await leaveMutation.mutateAsync();
      leaving.current = true;
      disconnect();
      clearLiveGameSession('HOST', sessionId);
      close();
      continueToDestination(destination);
    } catch {
      toast.error(copy.host.leaveGameError);
    }
  };

  return (
    <ConfirmDialog
      cancelLabel={copy.common.cancel}
      confirmLabel={copy.host.leaveGameConfirm}
      description={copy.host.leaveGameDescription}
      destructive
      isPending={leaveMutation.isPending}
      onConfirm={(controls) => void confirmLeave(controls)}
      onOpenChange={(open) => {
        if (!open && !leaveMutation.isPending) setDestination(null);
      }}
      open={Boolean(destination)}
      pendingLabel={copy.host.leaveGamePending}
      title={copy.host.leaveGameTitle}
    />
  );
}
