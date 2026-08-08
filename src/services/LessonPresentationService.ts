import { getCoursePermissions } from '@/lib/permissions/course-permission';
import { COURSE_PERMISSION } from '@/lib/permissions/permission-keys';
import { prisma } from '@/lib/prisma';
import { LessonService } from '@/services/LessonService';
import {
  type DeckUsage,
  type SlidePlanItem,
  SlideService,
} from '@/services/SlideService';
import { StorageService } from '@/services/StorageService';

type GenerateLessonDeckInput = {
  lessonId: string;
  userId: string;
  title: string;
  palette?: string;
  collection?: string;
  slides: SlidePlanItem[];
};

type GenerateLessonDeckResult = {
  deckId: string;
  deckUrl: string;
  slides: unknown[];
  warnings: string[];
  usage?: DeckUsage;
};

type SlideDeckAccess = 'view' | 'update';

export class SlideDeckAccessError extends Error {
  constructor(
    message: string,
    readonly code: 'NOT_FOUND' | 'FORBIDDEN'
  ) {
    super(message);
    this.name = 'SlideDeckAccessError';
  }
}

export class LessonPresentationService {
  static async assertDeckAccess(options: {
    deckId: string;
    userId: string;
    access: SlideDeckAccess;
  }): Promise<void> {
    const lesson = await prisma.lesson.findFirst({
      where: {
        presentationDeckId: options.deckId,
        deletedAt: null,
        module: {
          deletedAt: null,
          course: { deletedAt: null },
        },
      },
      select: {
        module: {
          select: { courseId: true },
        },
      },
    });

    if (!lesson) {
      throw new SlideDeckAccessError('Slide deck not found', 'NOT_FOUND');
    }

    const { containPermission } = await getCoursePermissions(
      options.userId,
      lesson.module.courseId
    );
    const requiredPermission =
      options.access === 'update'
        ? COURSE_PERMISSION.COURSE_CONTENT_UPDATE
        : COURSE_PERMISSION.COURSE_CONTENT_VIEW;

    if (!containPermission(requiredPermission)) {
      throw new SlideDeckAccessError(
        'Missing permission for this slide deck',
        'FORBIDDEN'
      );
    }
  }

  static async generateDeckFromPlan(
    input: GenerateLessonDeckInput
  ): Promise<GenerateLessonDeckResult> {
    const deck = await SlideService.generateDeckFromPlan({
      title: input.title,
      palette: input.palette,
      collection: input.collection,
      slides: input.slides,
    });

    const warnings = [...deck.warnings];

    try {
      await LessonService.saveLessonPresentation(input.lessonId, input.userId, {
        deckId: deck.deckId,
        deckKey: deck.s3Key,
      });
    } catch (error) {
      console.error('Failed to persist slide deck reference:', error);
      warnings.push('Deck generated but could not be saved to the lesson.');
    }

    return {
      deckId: deck.deckId,
      deckUrl: `/api/v1/ai/slides/${deck.deckId}`,
      slides: deck.slides,
      warnings,
      usage: deck.usage,
    };
  }

  static async getDeckHtml(deckId: string): Promise<string> {
    return StorageService.getSlideDeck(deckId);
  }

  static async saveDeckHtml(deckId: string, html: string): Promise<void> {
    await StorageService.saveSlideDeck(deckId, html);
  }

  static async getDeckPptx(deckId: string): Promise<ArrayBuffer> {
    return SlideService.getDeckPptx(deckId);
  }
}
