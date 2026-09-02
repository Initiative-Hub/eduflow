import { describe, expect, it } from 'vitest';
import {
  getAvailableStyleCollections,
  resolveRecommendedCollection,
} from '@/services/PresentationService';

describe('presentation style recommendation', () => {
  it('keeps built-in styles available when the live inventory is partial', () => {
    const availableStyles = getAvailableStyleCollections({
      clean_light: 'Clean light',
    });

    expect(availableStyles).toMatchObject({
      clean_light: 'Clean light',
      professional_focus: expect.any(String),
    });
  });

  it('prefers rmit_red_modern for university research and student-learning prompts', () => {
    const resolved = resolveRecommendedCollection({
      recommendedCollection: 'clean_light',
      lessonTitle:
        'Ứng dụng machine learning trong phân tích phản hồi sinh viên đại học',
      lessonContent:
        'Phân tích phản hồi sinh viên, nghiên cứu học thuật, khảo sát môn học, dữ liệu trường đại học.',
      context:
        'Tạo một slide deck học thuật hiện đại, giống một bài briefing học thuật hoặc thuyết trình nghiên cứu ở đại học.',
      styleCollections: {
        clean_light: 'Clean light',
        rmit_red_modern: 'RMIT red modern',
      },
    });

    expect(resolved).toBe('rmit_red_modern');
  });

  it('keeps clean_light for non-academic data-heavy topics', () => {
    const resolved = resolveRecommendedCollection({
      recommendedCollection: 'clean_light',
      lessonTitle: 'Quarterly warehouse operations dashboard',
      lessonContent:
        'Operational KPIs, throughput, defect rates, cost optimization, and capacity planning.',
      context:
        'Build a clean executive review focused on metrics, process efficiency, and reporting clarity.',
      styleCollections: {
        clean_light: 'Clean light',
        rmit_red_modern: 'RMIT red modern',
      },
    });

    expect(resolved).toBe('clean_light');
  });

  it('prefers an explicitly requested built-in style from the prompt context', () => {
    const resolved = resolveRecommendedCollection({
      recommendedCollection: 'clean_light',
      lessonTitle: 'Quarterly warehouse operations dashboard',
      lessonContent:
        'Operational KPIs, throughput, defect rates, cost optimization, and capacity planning.',
      context:
        'Create a metrics-focused deck and use the executive focus template.',
      styleCollections: {
        clean_light: 'Clean light',
        professional_focus: 'Professional focus',
      },
    });

    expect(resolved).toBe('professional_focus');
  });

  it('prefers an explicitly requested built-in style when the context is only the style name', () => {
    const resolved = resolveRecommendedCollection({
      recommendedCollection: 'clean_light',
      lessonTitle: 'Quarterly warehouse operations dashboard',
      lessonContent:
        'Operational KPIs, throughput, defect rates, cost optimization, and capacity planning.',
      context: 'rmit_red_modern',
      styleCollections: {
        clean_light: 'Clean light',
        rmit_red_modern: 'RMIT red modern',
      },
    });

    expect(resolved).toBe('rmit_red_modern');
  });

  it('resolves an explicitly requested built-in style even when the live inventory omits it', () => {
    const resolved = resolveRecommendedCollection({
      recommendedCollection: 'clean_light',
      lessonTitle: 'Basic filtering and pattern matching',
      lessonContent:
        'SQL WHERE clauses, filters, comparison operators, and pattern matching.',
      context: 'use professional_focus template',
      styleCollections: {
        clean_light: 'Clean light',
      },
    });

    expect(resolved).toBe('professional_focus');
  });
});
