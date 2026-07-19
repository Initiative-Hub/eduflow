import { describe, expect, it } from 'vitest';
import { getNextRecommendedCollectionForPlannerState } from '@/app/[locale]/(dashboard)/courses/[courseId]/lessons/[lessonId]/presentation-planner-state';

describe('presentation planner state', () => {
  it('clears any previous recommendation when planning starts', () => {
    expect(
      getNextRecommendedCollectionForPlannerState({
        phase: 'start',
        recommendedCollection: 'clean_light',
      })
    ).toBeNull();
  });

  it('clears the recommendation when planning fails or falls back', () => {
    expect(
      getNextRecommendedCollectionForPlannerState({
        phase: 'error',
        recommendedCollection: 'clean_light',
      })
    ).toBeNull();
  });

  it('uses the recommendation returned by the current planning run', () => {
    expect(
      getNextRecommendedCollectionForPlannerState({
        phase: 'done',
        recommendedCollection: 'rmit_red_modern',
      })
    ).toBe('rmit_red_modern');
  });

  it('does not keep a stale recommendation when the current run returns none', () => {
    expect(
      getNextRecommendedCollectionForPlannerState({
        phase: 'done',
        recommendedCollection: undefined,
      })
    ).toBeNull();
  });
});
