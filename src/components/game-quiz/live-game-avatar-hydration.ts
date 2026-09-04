import type { LiveGameSnapshot } from '@/lib/game-quiz/runtime-protocol';

export const isLiveGameAvatarObjectKey = (value: string | null | undefined) =>
  Boolean(value?.startsWith('users/') && value.includes('/avatars/'));

export function liveGameAvatarObjectKeys(snapshot: LiveGameSnapshot | null) {
  if (!snapshot) return [];
  const keys = new Set<string>();
  const add = (image: string | null | undefined) => {
    if (image && isLiveGameAvatarObjectKey(image)) keys.add(image);
  };
  add(snapshot.participant?.image);
  for (const participant of snapshot.participants) add(participant.image);
  for (const participant of snapshot.leaderboard) add(participant.image);
  for (const option of snapshot.currentRound?.options ?? []) {
    for (const answerer of option.answerers ?? []) add(answerer.image);
  }
  return [...keys].sort();
}

export function hydrateLiveGameSnapshotAvatars(
  snapshot: LiveGameSnapshot | null,
  signedUrls: ReadonlyMap<string, string>
) {
  if (!snapshot) return null;
  const image = (value: string | null | undefined) =>
    isLiveGameAvatarObjectKey(value)
      ? (signedUrls.get(value!) ?? null)
      : (value ?? null);
  const participant = snapshot.participant
    ? { ...snapshot.participant, image: image(snapshot.participant.image) }
    : null;
  const participants = snapshot.participants.map((item) => ({
    ...item,
    image: image(item.image),
  }));
  const leaderboard = snapshot.leaderboard.map((item) => ({
    ...item,
    image: image(item.image),
  }));
  const currentRound = snapshot.currentRound
    ? {
        ...snapshot.currentRound,
        options: snapshot.currentRound.options.map((option) => ({
          ...option,
          ...(option.answerers
            ? {
                answerers: option.answerers.map((answerer) => ({
                  ...answerer,
                  image: image(answerer.image),
                })),
              }
            : {}),
        })),
      }
    : null;
  return { ...snapshot, currentRound, leaderboard, participant, participants };
}
