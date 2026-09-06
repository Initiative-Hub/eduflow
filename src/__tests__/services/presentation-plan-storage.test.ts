import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearPresentationPlan,
  getSavedPresentationPlan,
  PRESENTATION_PLAN_STORAGE_PREFIX,
  savePresentationPlan,
} from '@/app/[locale]/(dashboard)/courses/[courseId]/lessons/[lessonId]/presentation-plan-storage';
import type { PlannedSlide } from '@/app/[locale]/(dashboard)/courses/[courseId]/lessons/[lessonId]/use-presentation';

const sampleSlides: PlannedSlide[] = [
  {
    id: 'slide-1',
    slideTitle: 'Introduction to Testing',
    layoutType: 'TITLE_SLIDE',
    bindings: { title: 'Intro', subtitle: 'Overview' },
  },
  {
    id: 'slide-2',
    slideTitle: 'Key Concepts',
    layoutType: 'TITLE_BULLETS',
    bindings: { items: ['Concept A', 'Concept B'] },
  },
];

describe('presentation-plan-storage', () => {
  const lessonId = 'test-lesson-123';
  const storageKey = `${PRESENTATION_PLAN_STORAGE_PREFIX}${lessonId}`;

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('returns null when no plan is saved', () => {
    expect(getSavedPresentationPlan(lessonId)).toBeNull();
  });

  it('returns null when lessonId is empty', () => {
    expect(getSavedPresentationPlan('')).toBeNull();
  });

  it('saves and retrieves presentation plan', () => {
    const saved = savePresentationPlan(lessonId, {
      plannedSlides: sampleSlides,
      instructions: 'Keep it concise',
      duration: '30',
      selectedCollection: 'modern',
      recommendedCollection: 'modern',
    });

    expect(saved).not.toBeNull();
    expect(saved?.lessonId).toBe(lessonId);
    expect(saved?.plannedSlides).toEqual(sampleSlides);
    expect(saved?.instructions).toBe('Keep it concise');
    expect(saved?.duration).toBe('30');
    expect(typeof saved?.updatedAt).toBe('number');

    const retrieved = getSavedPresentationPlan(lessonId);
    expect(retrieved).toEqual(saved);
  });

  it('rejects plans with empty slides array', () => {
    const result = savePresentationPlan(lessonId, {
      plannedSlides: [],
      instructions: 'Empty',
    });
    expect(result).toBeNull();
    expect(getSavedPresentationPlan(lessonId)).toBeNull();
  });

  it('clears presentation plan', () => {
    savePresentationPlan(lessonId, {
      plannedSlides: sampleSlides,
    });
    expect(getSavedPresentationPlan(lessonId)).not.toBeNull();

    clearPresentationPlan(lessonId);
    expect(getSavedPresentationPlan(lessonId)).toBeNull();
  });

  it('handles corrupted JSON in localStorage gracefully', () => {
    localStorage.setItem(storageKey, 'not-valid-json{{{');
    expect(getSavedPresentationPlan(lessonId)).toBeNull();
  });

  it('handles stored payload with non-array or empty plannedSlides gracefully', () => {
    localStorage.setItem(
      storageKey,
      JSON.stringify({ lessonId, plannedSlides: 'not-an-array' })
    );
    expect(getSavedPresentationPlan(lessonId)).toBeNull();

    localStorage.setItem(
      storageKey,
      JSON.stringify({ lessonId, plannedSlides: [] })
    );
    expect(getSavedPresentationPlan(lessonId)).toBeNull();
  });

  it('safely handles localStorage throws (e.g. QuotaExceededError)', () => {
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    const result = savePresentationPlan(lessonId, {
      plannedSlides: sampleSlides,
    });
    expect(result).toBeNull();
  });
});
