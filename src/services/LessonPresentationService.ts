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

export class LessonPresentationService {
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
