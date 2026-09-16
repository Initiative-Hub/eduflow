'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { apiClient } from '@/lib/api/api-client';
import { useSession } from '@/lib/auth-client';
import type { ActiveQuizAttempt } from '@/services/QuizAttemptService';

const channelName = 'course-quiz-attempts';
export const activeAttemptsKey = (userId?: string) =>
  ['active-quiz-attempts', userId] as const;

export function broadcastAttemptChange() {
  window.dispatchEvent(new Event(channelName));
  if (typeof BroadcastChannel !== 'undefined') {
    const channel = new BroadcastChannel(channelName);
    channel.postMessage('changed');
    channel.close();
  }
}

export function useActiveQuizAttempts() {
  const { data: session, isPending: isSessionPending } = useSession();
  const userId = session?.user.id;
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: activeAttemptsKey(userId),
    queryFn: () =>
      apiClient.get<ActiveQuizAttempt[]>('v1/quiz-attempts/active'),
    enabled: !!userId,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
    refetchInterval: 15000,
    refetchIntervalInBackground: false,
  });
  useEffect(() => {
    if (!userId) return;
    const refresh = () => {
      void queryClient.invalidateQueries({
        queryKey: activeAttemptsKey(userId),
      });
    };
    const channel =
      typeof BroadcastChannel === 'undefined'
        ? null
        : new BroadcastChannel(channelName);
    if (channel) channel.onmessage = refresh;
    window.addEventListener(channelName, refresh);
    return () => {
      channel?.close();
      window.removeEventListener(channelName, refresh);
    };
  }, [queryClient, userId]);
  useEffect(() => {
    queryClient.removeQueries({
      predicate: (q) =>
        q.queryKey[0] === 'active-quiz-attempts' && q.queryKey[1] !== userId,
    });
  }, [queryClient, userId]);
  return {
    ...query,
    userId,
    attempts: userId ? (query.data ?? []) : [],
    blocked:
      isSessionPending ||
      (!!userId &&
        (query.isPending || query.isError || (query.data?.length ?? 0) > 0)),
    checking: isSessionPending || (!!userId && query.isPending),
  };
}
