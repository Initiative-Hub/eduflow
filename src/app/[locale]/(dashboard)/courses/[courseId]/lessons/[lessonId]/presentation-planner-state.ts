export type PlannerRecommendationPhase = 'start' | 'done' | 'error';

export function getNextRecommendedCollectionForPlannerState(input: {
  phase: PlannerRecommendationPhase;
  recommendedCollection?: string | null;
}): string | null {
  if (input.phase !== 'done') {
    return null;
  }

  return input.recommendedCollection ?? null;
}
