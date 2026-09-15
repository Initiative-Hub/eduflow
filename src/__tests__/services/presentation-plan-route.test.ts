import type { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PresentationService } from '@/services/PresentationService';
import { SlideService } from '@/services/SlideService';
import slideLayoutGuidance from '../../../config/slide-layout-guidance.json';

vi.mock('@/lib/api/middlewares', () => ({
  withAuth: (handler: any) => {
    return (req: Request, ...args: any[]) => {
      const sessionData = args[0];
      return handler(req, sessionData, ...args.slice(1));
    };
  },
}));

vi.mock('@/services/PresentationService', () => ({
  PresentationService: {
    planPresentationStream: vi.fn(),
  },
}));

vi.mock('@/services/SlideService', () => ({
  SlideService: {
    getPlanningCollectionData: vi.fn(),
    getDefaultStyleCollections: vi.fn(),
    getStyleCollections: vi.fn(),
    isBuiltInCollectionName: vi.fn(),
  },
}));

function jsonRequest(body: unknown): NextRequest {
  return {
    json: async () => body,
  } as NextRequest;
}

const teacherSession = {
  session: { id: 'session-1' },
  user: {
    id: 'teacher-1',
    role: 'TEACHER',
  },
};

describe('presentation plan route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(SlideService.isBuiltInCollectionName).mockReturnValue(false);
  });

  it('loads standard layout metadata from the base collection when collection is auto-selected', async () => {
    vi.mocked(SlideService.getDefaultStyleCollections).mockResolvedValue({
      starter: 'Starter',
      clean_light: 'Clean light',
    } as never);
    vi.mocked(SlideService.getStyleCollections).mockResolvedValue({
      starter: 'Starter',
      clean_light: 'Clean light',
      custom_brand: 'Custom brand',
    } as never);

    const stream = new ReadableStream<string>({
      start(controller) {
        controller.close();
      },
    });
    vi.mocked(PresentationService.planPresentationStream).mockReturnValue(
      stream as never
    );

    const { POST } = await import('@/app/api/v1/presentation/plan/route');

    const response = await POST(
      jsonRequest({
        lessonId: 'lesson-1',
        duration: '30',
        collection: 'auto',
      }),
      teacherSession
    );

    expect(response.status).toBe(200);
    expect(SlideService.getPlanningCollectionData).not.toHaveBeenCalled();
    expect(SlideService.getDefaultStyleCollections).toHaveBeenCalledOnce();
    expect(PresentationService.planPresentationStream).toHaveBeenCalledWith(
      expect.objectContaining({
        lessonId: 'lesson-1',
        userId: 'teacher-1',
        duration: '30',
        standardCategoryMetadata: slideLayoutGuidance,
        styleCollections: {
          starter: 'Starter',
          clean_light: 'Clean light',
        },
      })
    );
  });

  it('plans a chosen built-in collection against the layouts it really has', async () => {
    // Built-in collections used to short-circuit to the generic guidance, on
    // the assumption that every one of them carries all 21 standard layouts.
    // A collection extracted from a real deck does not — Art & Activism has
    // 12 — so most slides were planned onto layouts it lacks and rendered in
    // a foreign style, and its real per-slot capacities never reached the
    // planner either.
    vi.mocked(SlideService.getStyleCollections).mockResolvedValue({
      clean_light: 'Clean light',
    } as never);
    vi.mocked(SlideService.isBuiltInCollectionName).mockReturnValue(true);
    vi.mocked(SlideService.getPlanningCollectionData).mockResolvedValue({
      collection: 'clean_light',
      categories: ['TITLE_SLIDE', 'TITLE_BULLETS'],
      metadata: { TITLE_SLIDE: { description: 'Cover' } },
      is_custom: false,
    } as never);

    const stream = new ReadableStream<string>({
      start(controller) {
        controller.close();
      },
    });
    vi.mocked(PresentationService.planPresentationStream).mockReturnValue(
      stream as never
    );

    const { POST } = await import('@/app/api/v1/presentation/plan/route');

    const response = await POST(
      jsonRequest({
        lessonId: 'lesson-2',
        duration: '30',
        collection: 'clean_light',
      }),
      teacherSession
    );

    expect(response.status).toBe(200);
    expect(SlideService.getPlanningCollectionData).toHaveBeenCalledWith(
      'clean_light'
    );
    expect(PresentationService.planPresentationStream).toHaveBeenCalledWith(
      expect.objectContaining({
        lessonId: 'lesson-2',
        templateCategories: ['TITLE_SLIDE', 'TITLE_BULLETS'],
        templateCategoryMetadata: { TITLE_SLIDE: { description: 'Cover' } },
      })
    );
  });

  it('uses selected custom collection categories directly for planning', async () => {
    const customMetadata = {
      HERO: {
        prompt_hint: 'Use for the opening hero slide.',
      },
      TIMELINE: {
        prompt_hint: 'Use for milestones.',
      },
    };

    vi.mocked(SlideService.getPlanningCollectionData).mockResolvedValue({
      collection: 'custom_brand',
      categories: ['HERO', 'TIMELINE'],
      is_custom: true,
      metadata: customMetadata,
    } as never);
    vi.mocked(SlideService.getStyleCollections).mockResolvedValue({
      clean_light: 'Clean light',
    } as never);
    vi.mocked(SlideService.isBuiltInCollectionName).mockReturnValue(false);

    const stream = new ReadableStream<string>({
      start(controller) {
        controller.close();
      },
    });
    vi.mocked(PresentationService.planPresentationStream).mockReturnValue(
      stream as never
    );

    const { POST } = await import('@/app/api/v1/presentation/plan/route');

    const response = await POST(
      jsonRequest({
        lessonId: 'lesson-3',
        duration: '15',
        collection: 'custom_brand',
      }),
      teacherSession
    );

    expect(response.status).toBe(200);
    expect(SlideService.getPlanningCollectionData).toHaveBeenCalledWith(
      'custom_brand'
    );
    expect(PresentationService.planPresentationStream).toHaveBeenCalledWith(
      expect.objectContaining({
        lessonId: 'lesson-3',
        standardCategoryMetadata: undefined,
        templateCategories: ['HERO', 'TIMELINE'],
        templateCategoryMetadata: customMetadata,
      })
    );
  });

  it('does not emit misleading planner metadata debug logs', async () => {
    vi.mocked(SlideService.getDefaultStyleCollections).mockResolvedValue({
      starter: 'Starter',
      clean_light: 'Clean light',
    } as never);

    const stream = new ReadableStream<string>({
      start(controller) {
        controller.close();
      },
    });
    vi.mocked(PresentationService.planPresentationStream).mockReturnValue(
      stream as never
    );

    const consoleLogSpy = vi
      .spyOn(console, 'log')
      .mockImplementation(() => undefined);

    const { POST } = await import('@/app/api/v1/presentation/plan/route');

    const response = await POST(
      jsonRequest({
        lessonId: 'lesson-4',
        duration: '15',
        collection: 'auto',
      }),
      teacherSession
    );

    expect(response.status).toBe(200);
    expect(consoleLogSpy).not.toHaveBeenCalled();

    consoleLogSpy.mockRestore();
  });
});
