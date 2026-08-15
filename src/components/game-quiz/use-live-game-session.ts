'use client';

import { useEffect, useState } from 'react';
import {
  type LiveGameAudience,
  type LiveGameSession,
  readLiveGameSession,
} from './live-game-session';

export function useLiveGameSession(audience: LiveGameAudience) {
  const [{ session, isHydrated }, setState] = useState<{
    session: LiveGameSession | null;
    isHydrated: boolean;
  }>({ session: null, isHydrated: false });

  useEffect(() => {
    setState({ session: readLiveGameSession(audience), isHydrated: true });
  }, [audience]);

  return { session, isHydrated };
}
