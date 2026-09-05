import type { PlannedSlide } from './use-presentation';

export const PRESENTATION_PLAN_STORAGE_PREFIX = 'eduflow:presentation-plan:';

export interface SavedPresentationPlan {
  lessonId: string;
  plannedSlides: PlannedSlide[];
  instructions?: string;
  duration?: string;
  selectedCollection?: string;
  recommendedCollection?: string | null;
  updatedAt: number;
}

export type SavePresentationPlanInput = Omit<
  SavedPresentationPlan,
  'updatedAt' | 'lessonId'
>;

/**
 * Retrieve the saved presentation outline for a given lesson from localStorage.
 */
export function getSavedPresentationPlan(
  lessonId: string
): SavedPresentationPlan | null {
  if (typeof window === 'undefined' || !lessonId) return null;
  try {
    const raw = window.localStorage.getItem(
      `${PRESENTATION_PLAN_STORAGE_PREFIX}${lessonId}`
    );
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === 'object' &&
      Array.isArray(parsed.plannedSlides) &&
      parsed.plannedSlides.length > 0
    ) {
      return parsed as SavedPresentationPlan;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Persist the presentation outline structure into localStorage for a given lesson.
 */
export function savePresentationPlan(
  lessonId: string,
  plan: SavePresentationPlanInput
): SavedPresentationPlan | null {
  if (typeof window === 'undefined' || !lessonId) return null;
  if (!Array.isArray(plan.plannedSlides) || plan.plannedSlides.length === 0) {
    return null;
  }
  try {
    const fullPlan: SavedPresentationPlan = {
      ...plan,
      lessonId,
      updatedAt: Date.now(),
    };
    window.localStorage.setItem(
      `${PRESENTATION_PLAN_STORAGE_PREFIX}${lessonId}`,
      JSON.stringify(fullPlan)
    );
    return fullPlan;
  } catch {
    return null;
  }
}

/**
 * Remove the saved presentation outline from localStorage for a given lesson.
 */
export function clearPresentationPlan(lessonId: string): void {
  if (typeof window === 'undefined' || !lessonId) return;
  try {
    window.localStorage.removeItem(
      `${PRESENTATION_PLAN_STORAGE_PREFIX}${lessonId}`
    );
  } catch {
    // Ignore storage errors (private browsing, quota exceeded, etc.)
  }
}
