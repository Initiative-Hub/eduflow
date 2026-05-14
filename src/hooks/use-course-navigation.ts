'use client';

import { useMemo } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface NavItem {
  type: 'lesson' | 'quiz';
  id: string;
  title: string;
  href: string;
}

interface ModuleWithLessons {
  id: string;
  lessons: { id: string; title: string }[];
}

interface QuizWithLesson {
  id: string;
  title: string;
  lessonId: string;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Builds a flat navigation list from modules → lessons → quizzes (in order)
 * and returns prev/next items relative to the given item.
 */
export function useCourseNavigation(
  courseId: string,
  currentItemId: string,
  currentItemType: 'lesson' | 'quiz',
  modules: ModuleWithLessons[],
  quizzes: QuizWithLesson[]
): {
  prev: NavItem | null;
  next: NavItem | null;
  allItems: NavItem[];
} {
  return useMemo(() => {
    if (!modules.length) {
      return { prev: null, next: null, allItems: [] };
    }

    const allItems: NavItem[] = [];
    for (const mod of modules) {
      for (const lesson of mod.lessons) {
        allItems.push({
          type: 'lesson',
          id: lesson.id,
          title: lesson.title,
          href: `/courses/${courseId}/lessons/${lesson.id}`,
        });
        // Add quizzes for this lesson right after the lesson
        const lessonQuizzes = quizzes.filter((q) => q.lessonId === lesson.id);
        for (const lq of lessonQuizzes) {
          allItems.push({
            type: 'quiz',
            id: lq.id,
            title: lq.title,
            href: `/courses/${courseId}/quiz/${lq.id}`,
          });
        }
      }
    }

    const currentIdx = allItems.findIndex(
      (item) => item.type === currentItemType && item.id === currentItemId
    );

    if (currentIdx === -1) {
      return { prev: null, next: null, allItems };
    }

    return {
      prev: currentIdx > 0 ? allItems[currentIdx - 1] : null,
      next: currentIdx < allItems.length - 1 ? allItems[currentIdx + 1] : null,
      allItems,
    };
  }, [courseId, currentItemId, currentItemType, modules, quizzes]);
}
