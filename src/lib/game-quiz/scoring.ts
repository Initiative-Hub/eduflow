export function calculateGamePoints(
  maxPoints: number,
  responseTimeMs: number,
  timerSeconds: number,
  isCorrect: boolean
) {
  if (!isCorrect || responseTimeMs < 0 || timerSeconds <= 0) {
    return 0;
  }

  const timeLimitMs = timerSeconds * 1_000;
  if (responseTimeMs >= timeLimitMs) {
    return 0;
  }

  return Math.round(maxPoints * (1 - responseTimeMs / (2 * timeLimitMs)));
}
