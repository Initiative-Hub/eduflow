import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { VocabularyItem } from '@/services/english/VocabularyService';

const savedVocabulary = vi.hoisted(() => ({
  count: vi.fn(),
  createMany: vi.fn(),
  deleteMany: vi.fn(),
  findMany: vi.fn(),
  findUnique: vi.fn(),
  updateMany: vi.fn(),
}));

const vocabularyList = vi.hoisted(() => ({
  create: vi.fn(),
  deleteMany: vi.fn(),
  findMany: vi.fn(),
  update: vi.fn(),
}));

const savedVocabularyListItem = vi.hoisted(() => ({
  createMany: vi.fn(),
  deleteMany: vi.fn(),
}));

const wordbankReviewSession = vi.hoisted(() => ({
  create: vi.fn(),
  findFirst: vi.fn(),
  update: vi.fn(),
  updateMany: vi.fn(),
}));

const wordbankReviewAttempt = vi.hoisted(() => ({
  create: vi.fn(),
}));

const prismaTransaction = vi.hoisted(() =>
  vi.fn(async (callback) =>
    callback({
      savedVocabulary,
      vocabularyList,
      savedVocabularyListItem,
      wordbankReviewSession,
      wordbankReviewAttempt,
    })
  )
);

vi.mock('@/lib/prisma', () => ({
  prisma: {
    savedVocabulary,
    vocabularyList,
    savedVocabularyListItem,
    wordbankReviewSession,
    wordbankReviewAttempt,
    $transaction: prismaTransaction,
  },
}));

const comet: VocabularyItem = {
  word: ' Comet ',
  partOfSpeech: 'noun',
  ipa: '/ˈkɑːmɪt/',
  audioUrl: null,
  englishDefinition: 'A celestial object consisting of ice and dust.',
  vietnameseTranslation: 'Sao chổi.',
  exampleSentence:
    'Along with asteroids and comets, the planets orbit the Sun.',
};

describe('SavedVocabularyService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    savedVocabulary.count.mockResolvedValue(0);
    savedVocabulary.createMany.mockResolvedValue({ count: 1 });
    savedVocabulary.deleteMany.mockResolvedValue({ count: 1 });
    savedVocabulary.findMany.mockResolvedValue([]);
    savedVocabulary.findUnique.mockResolvedValue(null);
    savedVocabulary.updateMany.mockResolvedValue({ count: 0 });
    vocabularyList.create.mockResolvedValue({
      id: 'list-1',
      userId: 'user-1',
      name: 'Space Terms',
      colorCode: null,
      createdAt: new Date('2026-06-16T00:00:00.000Z'),
      updatedAt: new Date('2026-06-16T00:00:00.000Z'),
    });
    vocabularyList.deleteMany.mockResolvedValue({ count: 1 });
    vocabularyList.findMany.mockResolvedValue([]);
    vocabularyList.update.mockResolvedValue({
      id: 'list-1',
      userId: 'user-1',
      name: 'Astronomy',
      colorCode: 'primary',
      createdAt: new Date('2026-06-16T00:00:00.000Z'),
      updatedAt: new Date('2026-06-16T00:00:00.000Z'),
    });
    savedVocabularyListItem.createMany.mockResolvedValue({ count: 1 });
    savedVocabularyListItem.deleteMany.mockResolvedValue({ count: 1 });
    wordbankReviewSession.create.mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      status: 'ACTIVE',
      quiz: {},
      clientQuiz: {},
      wordMap: [],
      createdAt: new Date('2026-06-16T00:00:00.000Z'),
      completedAt: null,
    });
    wordbankReviewSession.findFirst.mockResolvedValue(null);
    wordbankReviewSession.update.mockResolvedValue({});
    wordbankReviewSession.updateMany.mockResolvedValue({ count: 1 });
    wordbankReviewAttempt.create.mockResolvedValue({});
    prismaTransaction.mockImplementation(async (callback) =>
      callback({
        savedVocabulary,
        vocabularyList,
        savedVocabularyListItem,
        wordbankReviewSession,
        wordbankReviewAttempt,
      })
    );
  });

  it('saves duplicate words when their meanings differ', async () => {
    savedVocabulary.createMany.mockResolvedValue({ count: 2 });
    const { SavedVocabularyService } = await import(
      '@/services/english/SavedVocabularyService'
    );

    const alternateMeaning = {
      ...comet,
      word: 'comet',
      englishDefinition: 'A bright object that moves through the night sky.',
      vietnameseTranslation: 'Một vật thể sáng di chuyển trên bầu trời đêm.',
    };

    const result = await SavedVocabularyService.saveMany('user-1', [
      comet,
      alternateMeaning,
    ]);

    expect(savedVocabulary.createMany).toHaveBeenCalledWith({
      data: [
        {
          userId: 'user-1',
          word: 'comet',
          partOfSpeech: 'noun',
          ipa: '/ˈkɑːmɪt/',
          audioUrl: null,
          englishDefinition: 'A celestial object consisting of ice and dust.',
          vietnameseTranslation: 'Sao chổi.',
          exampleSentence:
            'Along with asteroids and comets, the planets orbit the Sun.',
          examples: [],
          sourceSnippet: null,
          masteryLevel: 0,
          nextReviewAt: expect.any(Date),
        },
        {
          userId: 'user-1',
          word: 'comet',
          partOfSpeech: 'noun',
          ipa: '/ˈkɑːmɪt/',
          audioUrl: null,
          englishDefinition:
            'A bright object that moves through the night sky.',
          vietnameseTranslation:
            'Một vật thể sáng di chuyển trên bầu trời đêm.',
          exampleSentence:
            'Along with asteroids and comets, the planets orbit the Sun.',
          sourceSnippet: null,
          masteryLevel: 0,
          nextReviewAt: expect.any(Date),
        },
      ],
    });
    expect(result.savedCount).toBe(2);
  });

  it('lists saved vocabulary with total and saved word lookup metadata', async () => {
    savedVocabulary.count.mockResolvedValue(1);
    savedVocabulary.findMany.mockResolvedValue([
      {
        id: 'saved-1',
        userId: 'user-1',
        word: 'comet',
        partOfSpeech: 'noun',
        ipa: '/ˈkɑːmɪt/',
        audioUrl: null,
        englishDefinition: 'A celestial object consisting of ice and dust.',
        vietnameseTranslation: 'Sao chổi.',
        exampleSentence:
          'Along with asteroids and comets, the planets orbit the Sun.',
        sourceSnippet: null,
        masteryLevel: 1,
        nextReviewAt: new Date('2026-06-16T00:00:00.000Z'),
        listItems: [
          {
            list: {
              id: 'list-1',
              name: 'Space Terms',
              colorCode: null,
            },
          },
        ],
        savedAt: new Date('2026-06-16T00:00:00.000Z'),
      },
    ]);

    const { SavedVocabularyService } = await import(
      '@/services/english/SavedVocabularyService'
    );

    const result = await SavedVocabularyService.list('user-1', {
      now: new Date('2026-06-16T00:00:00.000Z'),
    });

    expect(savedVocabulary.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1' },
        orderBy: { savedAt: 'desc' },
        include: {
          listItems: {
            include: {
              list: {
                select: { id: true, name: true, colorCode: true },
              },
            },
          },
        },
      })
    );
    expect(result.total).toBe(1);
    expect(result.savedWords).toEqual(['comet']);
    expect(result.stats.dueWords).toBe(1);
    expect(result.items[0]?.lists).toEqual([
      { id: 'list-1', name: 'Space Terms', colorCode: null },
    ]);
  });

  it('pushes search, mastery, list filtering, and pagination into Prisma', async () => {
    const { SavedVocabularyService } = await import(
      '@/services/english/SavedVocabularyService'
    );

    await SavedVocabularyService.list('user-1', {
      search: ' comet ',
      listId: 'list-1',
      mastery: 'due',
      sort: 'weakest',
      limit: 20,
      offset: 40,
      now: new Date('2026-06-16T00:00:00.000Z'),
    });

    expect(savedVocabulary.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user-1',
          nextReviewAt: { lte: new Date('2026-06-16T00:00:00.000Z') },
          listItems: { some: { listId: 'list-1', list: { userId: 'user-1' } } },
          OR: expect.arrayContaining([
            { word: { contains: 'comet', mode: 'insensitive' } },
          ]),
        }),
        orderBy: [
          { masteryLevel: 'asc' },
          { nextReviewAt: 'asc' },
          { savedAt: 'desc' },
        ],
        skip: 40,
        take: 20,
      })
    );
  });

  it('removes a vocabulary word by normalized text for the current user', async () => {
    const { SavedVocabularyService } = await import(
      '@/services/english/SavedVocabularyService'
    );

    const result = await SavedVocabularyService.remove('user-1', ' Comet ');

    expect(savedVocabulary.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', word: 'comet' },
    });
    expect(result.removedCount).toBe(1);
  });

  it('creates and lists user-owned word lists', async () => {
    vocabularyList.findMany.mockResolvedValue([
      {
        id: 'list-1',
        userId: 'user-1',
        name: 'Space Terms',
        colorCode: null,
        createdAt: new Date('2026-06-16T00:00:00.000Z'),
        updatedAt: new Date('2026-06-16T00:00:00.000Z'),
        _count: { items: 2 },
      },
    ]);

    const { SavedVocabularyService } = await import(
      '@/services/english/SavedVocabularyService'
    );

    const created = await SavedVocabularyService.createList('user-1', {
      name: ' Space Terms ',
      colorCode: null,
    });
    const lists = await SavedVocabularyService.listLists('user-1');

    expect(vocabularyList.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        name: 'Space Terms',
        colorCode: null,
      },
    });
    expect(created.name).toBe('Space Terms');
    expect(lists[0]?.wordCount).toBe(2);
  });

  it('bulk assigns lists and mastery to saved words for the current user', async () => {
    savedVocabulary.findMany.mockResolvedValue([{ id: 'saved-1' }]);
    savedVocabulary.updateMany.mockResolvedValue({ count: 1 });
    vocabularyList.findMany.mockResolvedValue([{ id: 'list-1' }]);

    const { SavedVocabularyService } = await import(
      '@/services/english/SavedVocabularyService'
    );

    const result = await SavedVocabularyService.updateItems('user-1', {
      vocabularyIds: ['saved-1'],
      addListIds: ['list-1'],
      masteryLevel: 2,
    });

    expect(savedVocabulary.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['saved-1'] }, userId: 'user-1' },
      data: expect.objectContaining({ masteryLevel: 2 }),
    });
    expect(savedVocabularyListItem.createMany).toHaveBeenCalledWith({
      data: [{ savedVocabularyId: 'saved-1', listId: 'list-1' }],
      skipDuplicates: true,
    });
    expect(result.updatedCount).toBe(1);
  });

  it('creates a due-word review quiz without always placing the answer first', async () => {
    savedVocabulary.findMany.mockResolvedValue([
      {
        id: 'saved-1',
        word: 'comet',
        partOfSpeech: 'noun',
        ipa: '/ˈkɑːmɪt/',
        audioUrl: null,
        englishDefinition: 'A celestial object consisting of ice and dust.',
        vietnameseTranslation: 'Sao chổi.',
        exampleSentence:
          'Along with asteroids and comets, the planets orbit the Sun.',
        sourceSnippet: null,
        masteryLevel: 0,
        nextReviewAt: new Date('2026-06-16T00:00:00.000Z'),
        savedAt: new Date('2026-06-16T00:00:00.000Z'),
        listItems: [],
      },
      {
        id: 'saved-2',
        word: 'asteroid',
        partOfSpeech: 'noun',
        ipa: '/ˈæstərɔɪd/',
        audioUrl: null,
        englishDefinition: 'A small rocky body orbiting the sun.',
        vietnameseTranslation: 'Tiểu hành tinh.',
        exampleSentence: 'The asteroid moved through space.',
        sourceSnippet: null,
        masteryLevel: 1,
        nextReviewAt: new Date('2026-06-16T00:00:00.000Z'),
        savedAt: new Date('2026-06-15T00:00:00.000Z'),
        listItems: [],
      },
    ]);
    wordbankReviewSession.create.mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      status: 'ACTIVE',
      quiz: {
        title: 'Wordbank Review',
        description: 'Review due words from your Wordbank.',
        type: 'multiple_choice',
        questions: [],
      },
      clientQuiz: {
        title: 'Wordbank Review',
        description: 'Review due words from your Wordbank.',
        type: 'multiple_choice',
        questions: [],
      },
      wordMap: [{ questionIndex: 0, savedVocabularyId: 'saved-1' }],
      createdAt: new Date('2026-06-16T00:00:00.000Z'),
      completedAt: null,
    });

    const { SavedVocabularyService } = await import(
      '@/services/english/SavedVocabularyService'
    );

    await SavedVocabularyService.createReviewSession('user-1', {
      now: new Date('2026-06-16T00:00:00.000Z'),
    });

    const createInput = wordbankReviewSession.create.mock.calls[0]?.[0];
    const quiz = createInput?.data.quiz;
    expect(quiz.questions[0].options[0].isCorrect).toBe(false);
    expect(wordbankReviewSession.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        status: 'ACTIVE',
        wordMap: expect.arrayContaining([
          expect.objectContaining({
            questionIndex: 0,
            savedVocabularyId: 'saved-1',
          }),
        ]),
      }),
    });
  });

  it('creates a review quiz from selected vocabulary ids without due filtering', async () => {
    savedVocabulary.findMany.mockResolvedValue([
      {
        id: 'saved-1',
        word: 'comet',
        partOfSpeech: 'noun',
        ipa: '/ˈkɑːmɪt/',
        audioUrl: null,
        englishDefinition: 'A celestial object consisting of ice and dust.',
        vietnameseTranslation: 'Sao chổi.',
        exampleSentence:
          'Along with asteroids and comets, the planets orbit the Sun.',
        sourceSnippet: null,
        masteryLevel: 0,
        nextReviewAt: new Date('2026-07-16T00:00:00.000Z'),
        savedAt: new Date('2026-06-16T00:00:00.000Z'),
        listItems: [],
      },
      {
        id: 'saved-2',
        word: 'asteroid',
        partOfSpeech: 'noun',
        ipa: '/ˈæstərɔɪd/',
        audioUrl: null,
        englishDefinition: 'A small rocky body orbiting the sun.',
        vietnameseTranslation: 'Tiểu hành tinh.',
        exampleSentence: 'The asteroid moved through space.',
        sourceSnippet: null,
        masteryLevel: 1,
        nextReviewAt: new Date('2026-07-16T00:00:00.000Z'),
        savedAt: new Date('2026-06-15T00:00:00.000Z'),
        listItems: [],
      },
    ]);

    const { SavedVocabularyService } = await import(
      '@/services/english/SavedVocabularyService'
    );

    await SavedVocabularyService.createReviewSession('user-1', {
      vocabularyIds: ['saved-2', 'saved-1'],
    });

    const findInput = savedVocabulary.findMany.mock.calls[0]?.[0];
    expect(findInput.where).toEqual({
      id: { in: ['saved-2', 'saved-1'] },
      userId: 'user-1',
    });

    const createInput = wordbankReviewSession.create.mock.calls[0]?.[0];
    expect(createInput?.data.wordMap).toEqual([
      { questionIndex: 0, savedVocabularyId: 'saved-2' },
      { questionIndex: 1, savedVocabularyId: 'saved-1' },
    ]);
    expect(createInput?.data.quiz.questions[0].explanation).toBe(
      'asteroid (/ˈæstərɔɪd/)\nNghĩa: Tiểu hành tinh.\nA small rocky body orbiting the sun.'
    );
  });

  it('returns word mastery changes after submitting a review quiz', async () => {
    wordbankReviewSession.findFirst.mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      status: 'ACTIVE',
      quiz: {
        title: 'Wordbank Review',
        description: 'Review due words from your Wordbank.',
        type: 'multiple_choice',
        questions: [
          {
            type: 'multiple_choice',
            prompt: 'Which definition matches "comet"?',
            options: [
              {
                id: 'q1-option-1',
                text: 'A celestial object consisting of ice and dust.',
                isCorrect: true,
              },
              {
                id: 'q1-option-2',
                text: 'A small rocky body orbiting the sun.',
                isCorrect: false,
              },
            ],
          },
        ],
      },
      wordMap: [{ questionIndex: 0, savedVocabularyId: 'saved-1' }],
      createdAt: new Date('2026-06-16T00:00:00.000Z'),
      completedAt: null,
    });
    savedVocabulary.findMany.mockResolvedValue([
      {
        id: 'saved-1',
        word: 'comet',
        partOfSpeech: 'noun',
        ipa: '/ˈkɑːmɪt/',
        audioUrl: null,
        englishDefinition: 'A celestial object consisting of ice and dust.',
        vietnameseTranslation: 'Sao chổi.',
        exampleSentence:
          'Along with asteroids and comets, the planets orbit the Sun.',
        sourceSnippet: null,
        masteryLevel: 1,
        nextReviewAt: new Date('2026-06-16T00:00:00.000Z'),
        savedAt: new Date('2026-06-16T00:00:00.000Z'),
        listItems: [],
      },
    ]);
    savedVocabulary.updateMany.mockResolvedValue({ count: 1 });

    const { SavedVocabularyService } = await import(
      '@/services/english/SavedVocabularyService'
    );

    const result = await SavedVocabularyService.submitReviewSession(
      'user-1',
      'session-1',
      {
        answers: {
          0: {
            type: 'multiple_choice',
            selectedOptionId: 'q1-option-1',
          },
        },
        now: new Date('2026-06-16T00:00:00.000Z'),
      }
    );

    expect(result.masteryResults).toEqual([
      {
        savedVocabularyId: 'saved-1',
        word: 'comet',
        englishDefinition: 'A celestial object consisting of ice and dust.',
        vietnameseTranslation: 'Sao chổi.',
        previousMasteryLevel: 1,
        nextMasteryLevel: 2,
        isCorrect: true,
      },
    ]);
    expect(prismaTransaction).toHaveBeenCalled();
    expect(wordbankReviewSession.updateMany).toHaveBeenCalledWith({
      where: { id: 'session-1', userId: 'user-1', status: 'ACTIVE' },
      data: {
        status: 'COMPLETED',
        completedAt: new Date('2026-06-16T00:00:00.000Z'),
      },
    });
  });

  it('checks one review answer without completing the review session', async () => {
    wordbankReviewSession.findFirst.mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      status: 'ACTIVE',
      quiz: {
        title: 'Wordbank Review',
        description: 'Review due words from your Wordbank.',
        type: 'multiple_choice',
        questions: [
          {
            type: 'multiple_choice',
            prompt: 'Which definition matches "comet"?',
            options: [
              {
                id: 'q1-option-1',
                text: 'A celestial object consisting of ice and dust.',
                isCorrect: true,
              },
              {
                id: 'q1-option-2',
                text: 'A small rocky body orbiting the sun.',
                isCorrect: false,
              },
            ],
          },
        ],
      },
      wordMap: [{ questionIndex: 0, savedVocabularyId: 'saved-1' }],
      createdAt: new Date('2026-06-16T00:00:00.000Z'),
      completedAt: null,
    });

    const { SavedVocabularyService } = await import(
      '@/services/english/SavedVocabularyService'
    );

    const result = await SavedVocabularyService.checkReviewSessionAnswer(
      'user-1',
      'session-1',
      {
        questionIndex: 0,
        answer: {
          type: 'multiple_choice',
          selectedOptionId: 'q1-option-2',
        },
      }
    );

    expect(result).toEqual({
      isCorrect: false,
      reviewQuestion: {
        type: 'multiple_choice',
        prompt: 'Which definition matches "comet"?',
        options: [
          {
            id: 'q1-option-1',
            text: 'A celestial object consisting of ice and dust.',
            isCorrect: true,
          },
          {
            id: 'q1-option-2',
            text: 'A small rocky body orbiting the sun.',
            isCorrect: false,
          },
        ],
      },
    });
    expect(wordbankReviewSession.updateMany).not.toHaveBeenCalled();
    expect(wordbankReviewAttempt.create).not.toHaveBeenCalled();
    expect(savedVocabulary.updateMany).not.toHaveBeenCalled();
  });

  it('rejects duplicate review submissions after the active session is claimed', async () => {
    wordbankReviewSession.findFirst.mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      status: 'ACTIVE',
      quiz: {
        title: 'Wordbank Review',
        description: 'Review due words from your Wordbank.',
        type: 'multiple_choice',
        questions: [
          {
            type: 'multiple_choice',
            prompt: 'Which definition matches "comet"?',
            options: [
              {
                id: 'q1-option-1',
                text: 'A celestial object consisting of ice and dust.',
                isCorrect: true,
              },
            ],
          },
        ],
      },
      wordMap: [{ questionIndex: 0, savedVocabularyId: 'saved-1' }],
      createdAt: new Date('2026-06-16T00:00:00.000Z'),
      completedAt: null,
    });
    wordbankReviewSession.updateMany.mockResolvedValue({ count: 0 });

    const { SavedVocabularyService } = await import(
      '@/services/english/SavedVocabularyService'
    );

    await expect(
      SavedVocabularyService.submitReviewSession('user-1', 'session-1', {
        answers: {
          0: {
            type: 'multiple_choice',
            selectedOptionId: 'q1-option-1',
          },
        },
        now: new Date('2026-06-16T00:00:00.000Z'),
      })
    ).rejects.toThrow('Review session not found');

    expect(wordbankReviewAttempt.create).not.toHaveBeenCalled();
    expect(savedVocabulary.updateMany).not.toHaveBeenCalled();
  });
});
