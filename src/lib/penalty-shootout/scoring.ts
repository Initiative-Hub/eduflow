import type { PenaltyGameResult, ShotResult } from './types';

export function calculatePenaltyScore(
  shotResults: ShotResult[]
): PenaltyGameResult {
  const shots = shotResults.length;
  const goals = shotResults.filter((s) => s.isGoal).length;
  const percentage = shots > 0 ? (goals / shots) * 100 : 0;
  return { goals, shots, percentage, shotResults };
}
