import type { Prisma } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { savedVocabularyListInclude, toSavedVocabularyItem } from './mappers';
import { getLocalDayRange } from './scheduling';
import { listVocabularyLists } from './lists';
import type {
  SavedVocabularyListResult,
  WordbankListOptions,
  WordbankSort,
  WordbankStats,
} from './types';

export function buildWordbankListWhere(
  userId: string,
  options: WordbankListOptions = {}
): Prisma.SavedVocabularyWhereInput {
  const now = options.now ?? new Date();
  const normalizedSearch = options.search?.trim() ?? '';
  const listId = options.listId ?? 'all';
  const mastery = options.mastery ?? 'all';
  const where: Prisma.SavedVocabularyWhereInput = { userId };

  if (listId !== 'all') {
    where.listItems = { some: { listId, list: { userId } } };
  }

  if (mastery === 'due') {
    where.nextReviewAt = { lte: now };
  } else if (mastery !== 'all') {
    where.masteryLevel = Number(mastery);
  }

  if (normalizedSearch) {
    where.OR = [
      { word: { contains: normalizedSearch, mode: 'insensitive' } },
      {
        englishDefinition: {
          contains: normalizedSearch,
          mode: 'insensitive',
        },
      },
      {
        vietnameseTranslation: {
          contains: normalizedSearch,
          mode: 'insensitive',
        },
      },
      {
        exampleSentence: {
          contains: normalizedSearch,
          mode: 'insensitive',
        },
      },
      {
        listItems: {
          some: {
            list: {
              name: { contains: normalizedSearch, mode: 'insensitive' },
              userId,
            },
          },
        },
      },
    ];
  }

  return where;
}

function getWordbankOrderBy(
  sort: WordbankSort = 'recent'
):
  | Prisma.SavedVocabularyOrderByWithRelationInput
  | Prisma.SavedVocabularyOrderByWithRelationInput[] {
  if (sort === 'az') return { word: 'asc' };

  if (sort === 'weakest') {
    return [
      { masteryLevel: 'asc' },
      { nextReviewAt: 'asc' },
      { savedAt: 'desc' },
    ];
  }

  return { savedAt: 'desc' };
}

async function getSavedWords(userId: string) {
  const rows = await prisma.savedVocabulary.findMany({
    where: { userId },
    orderBy: { savedAt: 'desc' },
    select: { word: true },
  });

  return rows.map((item) => item.word);
}

async function getStats(
  userId: string,
  now = new Date()
): Promise<WordbankStats> {
  const { start, end } = getLocalDayRange(now);
  const [
    savedWords,
    savedToday,
    dueWords,
    newWords,
    familiarWords,
    masteredWords,
  ] = await Promise.all([
    prisma.savedVocabulary.count({ where: { userId } }),
    prisma.savedVocabulary.count({
      where: { userId, savedAt: { gte: start, lt: end } },
    }),
    prisma.savedVocabulary.count({
      where: { userId, nextReviewAt: { lte: now } },
    }),
    prisma.savedVocabulary.count({ where: { userId, masteryLevel: 0 } }),
    prisma.savedVocabulary.count({ where: { userId, masteryLevel: 1 } }),
    prisma.savedVocabulary.count({ where: { userId, masteryLevel: 2 } }),
  ]);

  return {
    savedWords,
    savedToday,
    dueWords,
    newWords,
    familiarWords,
    masteredWords,
  };
}

export async function listSavedVocabulary(
  userId: string,
  options: WordbankListOptions = {}
): Promise<SavedVocabularyListResult> {
  const where = buildWordbankListWhere(userId, options);
  const offset = options.offset ?? 0;
  const limit = options.limit ?? 200;
  const totalPromise = prisma.savedVocabulary.count({ where: { userId } });
  const filteredTotalPromise = prisma.savedVocabulary.count({ where });
  const itemsPromise = prisma.savedVocabulary.findMany({
    where,
    orderBy: getWordbankOrderBy(options.sort),
    skip: offset,
    take: limit,
    include: savedVocabularyListInclude,
  });
  const savedWordsPromise = getSavedWords(userId);
  const listsPromise = listVocabularyLists(userId);
  const statsPromise = getStats(userId, options.now);
  const [total, filteredTotal, items, savedWords, lists, stats] =
    await Promise.all([
      totalPromise,
      filteredTotalPromise,
      itemsPromise,
      savedWordsPromise,
      listsPromise,
      statsPromise,
    ]);

  return {
    items: items.map(toSavedVocabularyItem),
    total,
    filteredTotal,
    savedWords,
    lists,
    stats,
  };
}
