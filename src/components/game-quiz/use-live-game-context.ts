'use client';

import { useEffect, useState } from 'react';
import {
  type LiveGameAudience,
  type LiveGameContext,
  readLiveGameContext,
} from './live-game-context';

export function useLiveGameContext(audience: LiveGameAudience) {
  const [{ context, isHydrated }, setState] = useState<{
    context: LiveGameContext | null;
    isHydrated: boolean;
  }>({ context: null, isHydrated: false });

  useEffect(() => {
    setState({ context: readLiveGameContext(audience), isHydrated: true });
  }, [audience]);

  return { context, isHydrated };
}
