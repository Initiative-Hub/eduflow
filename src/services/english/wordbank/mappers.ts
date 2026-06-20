import type { Prisma } from '@/generated/prisma';
import type { SavedVocabularyItem, VocabularyListSummary } from './types';

export const normalizeWord = (word: string) => word.trim().toLowerCase();
export const normalizeListName = (name: string) =>
  name.trim().replace(/\s+/g, ' ');

export const clampMasteryLevel = (value: number) =>
  Math.min(2, Math.max(0, value));

export function toListSummary(item: {
  id: string;
  name: string;
  colorCode: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  _count?: { items?: number };
}): VocabularyListSummary {
  return {
    id: item.id,
    name: item.name,
    colorCode: item.colorCode,
    wordCount: item._count?.items,
    createdAt: item.createdAt?.toISOString(),
    updatedAt: item.updatedAt?.toISOString(),
  };
}

export const savedVocabularyListInclude = {
  listItems: {
    include: {
      list: {
        select: { id: true, name: true, colorCode: true },
      },
    },
  },
} satisfies Prisma.SavedVocabularyInclude;

export const toSavedVocabularyItem = (item: {
  id: string;
  word: string;
  partOfSpeech: string;
  ipa: string | null;
  audioUrl: string | null;
  englishDefinition: string;
  vietnameseTranslation: string;
  exampleSentence: string;
  sourceSnippet: string | null;
  masteryLevel?: number;
  nextReviewAt?: Date;
  savedAt: Date;
  listItems?: {
    list: {
      id: string;
      name: string;
      colorCode: string | null;
    };
  }[];
}): SavedVocabularyItem => ({
  id: item.id,
  word: item.word,
  partOfSpeech: item.partOfSpeech,
  ipa: item.ipa,
  audioUrl: item.audioUrl,
  englishDefinition: item.englishDefinition,
  vietnameseTranslation: item.vietnameseTranslation,
  exampleSentence: item.exampleSentence,
  sourceSnippet: item.sourceSnippet,
  masteryLevel: item.masteryLevel ?? 0,
  nextReviewAt: (item.nextReviewAt ?? item.savedAt).toISOString(),
  lists: item.listItems?.map((listItem) => toListSummary(listItem.list)) ?? [],
  savedAt: item.savedAt.toISOString(),
});
