import 'server-only';

import { getUpstashRestRedisClient } from '@/lib/upstash/redis/client';

const PRESENCE_TTL_SECONDS = 45;

export async function touchGameParticipantPresence(
  sessionId: string,
  participantId: string
) {
  await getUpstashRestRedisClient().set(
    `game-presence:${sessionId}:${participantId}`,
    Date.now(),
    { ex: PRESENCE_TTL_SECONDS }
  );

  return { available: true } as const;
}
