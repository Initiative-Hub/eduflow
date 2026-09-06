import { prisma } from '@/lib/prisma';
import { clampMasteryLevel, normalizeListName, toListSummary } from './mappers';
import { getNextReviewDate } from './scheduling';
import type {
  CreateVocabularyListInput,
  UpdateSavedVocabularyItemsInput,
  UpdateSavedVocabularyItemsResult,
  UpdateVocabularyListInput,
  VocabularyListSummary,
} from './types';

export async function listVocabularyLists(
  userId: string
): Promise<VocabularyListSummary[]> {
  const lists = await prisma.vocabularyList.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { items: true } } },
  });

  return lists.map(toListSummary);
}

export async function createVocabularyList(
  userId: string,
  input: CreateVocabularyListInput
): Promise<VocabularyListSummary> {
  const name = normalizeListName(input.name);
  if (!name) throw new Error('Word List name is required');

  const list = await prisma.vocabularyList.create({
    data: {
      userId,
      name,
      colorCode: input.colorCode?.trim() || null,
    },
  });

  return toListSummary(list);
}

export async function updateVocabularyList(
  userId: string,
  listId: string,
  input: UpdateVocabularyListInput
): Promise<VocabularyListSummary> {
  const existingList = await prisma.vocabularyList.findFirst({
    where: { id: listId, userId },
    select: { id: true },
  });

  if (!existingList) throw new Error('Word List not found');

  const list = await prisma.vocabularyList.update({
    where: { id: listId },
    data: {
      ...(input.name === undefined
        ? {}
        : { name: normalizeListName(input.name) }),
      ...(input.colorCode === undefined
        ? {}
        : { colorCode: input.colorCode?.trim() || null }),
    },
  });

  return toListSummary(list);
}

export async function deleteVocabularyList(userId: string, listId: string) {
  const result = await prisma.vocabularyList.deleteMany({
    where: { id: listId, userId },
  });

  return { deletedCount: result.count };
}

export async function updateSavedVocabularyItems(
  userId: string,
  input: UpdateSavedVocabularyItemsInput
): Promise<UpdateSavedVocabularyItemsResult> {
  const vocabularyIds = Array.from(new Set(input.vocabularyIds)).filter(
    Boolean
  );
  if (vocabularyIds.length === 0) return { updatedCount: 0 };
  const ownedVocabularyIds = await prisma.savedVocabulary
    .findMany({
      where: { id: { in: vocabularyIds }, userId },
      select: { id: true },
    })
    .then((rows) => rows.map((row) => row.id));

  if (ownedVocabularyIds.length === 0) return { updatedCount: 0 };

  const updateData = {} as Parameters<
    typeof prisma.savedVocabulary.updateMany
  >[0]['data'];

  if (typeof input.masteryLevel === 'number') {
    const masteryLevel = clampMasteryLevel(input.masteryLevel);
    updateData.masteryLevel = masteryLevel;
    updateData.nextReviewAt = getNextReviewDate(masteryLevel);
  }

  if (typeof input.exampleSentence === 'string') {
    updateData.exampleSentence = input.exampleSentence.trim();
  }

  if (Array.isArray(input.examples)) {
    updateData.examples = input.examples;
  }

  const updateResult =
    Object.keys(updateData).length > 0
      ? await prisma.savedVocabulary.updateMany({
          where: { id: { in: ownedVocabularyIds }, userId },
          data: updateData,
        })
      : { count: 0 };

  if (input.removeListIds?.length) {
    await prisma.savedVocabularyListItem.deleteMany({
      where: {
        savedVocabularyId: { in: ownedVocabularyIds },
        listId: { in: input.removeListIds },
        list: { userId },
      },
    });
  }

  if (input.addListIds?.length) {
    const ownedListIds = await prisma.vocabularyList
      .findMany({
        where: { id: { in: input.addListIds }, userId },
        select: { id: true },
      })
      .then((rows) => rows.map((row) => row.id));

    if (ownedListIds.length > 0) {
      await prisma.savedVocabularyListItem.createMany({
        data: ownedVocabularyIds.flatMap((savedVocabularyId) =>
          ownedListIds.map((listId) => ({
            savedVocabularyId,
            listId,
          }))
        ),
        skipDuplicates: true,
      });
    }
  }

  const [total, savedWords, lists] = await Promise.all([
    prisma.savedVocabulary.count({ where: { userId } }),
    prisma.savedVocabulary.findMany({
      where: { userId },
      orderBy: { savedAt: 'desc' },
      select: { word: true },
    }),
    listVocabularyLists(userId),
  ]);

  return {
    lists,
    savedWords: savedWords.map((item) => item.word),
    total,
    updatedCount:
      updateResult.count > 0 ? updateResult.count : ownedVocabularyIds.length,
  };
}
