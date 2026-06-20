import type { Prisma } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { calculateScore } from '@/lib/quiz-template/scoring';
import { stripQuizAnswers } from '@/lib/quiz-template/strip-answers';
import type {
  MultipleChoiceQuestion,
  QuizContent,
  StudentAnswer,
  StudentAnswers,
} from '@/lib/quiz-template/types';
import {
  clampMasteryLevel,
  savedVocabularyListInclude,
  toSavedVocabularyItem,
} from './mappers';
import { getNextReviewDate } from './scheduling';
import type {
  CreateReviewSessionInput,
  ReviewWordMapItem,
  SavedVocabularyItem,
  SubmitReviewSessionInput,
  SubmitReviewSessionResult,
  WordbankReviewSessionResult,
} from './types';

type OptionDraft = {
  text: string;
  isCorrect: boolean;
};

function rotateCorrectAnswerAwayFromFirst(
  options: OptionDraft[],
  seed: string
) {
  if (options.length <= 1) return options;
  const seedValue = Array.from(seed).reduce(
    (total, character) => total + character.charCodeAt(0),
    0
  );
  const shift = (seedValue % (options.length - 1)) + 1;
  return [...options.slice(shift), ...options.slice(0, shift)];
}

function buildReviewQuiz(items: SavedVocabularyItem[]): {
  quiz: QuizContent;
  wordMap: ReviewWordMapItem[];
} {
  const questions: MultipleChoiceQuestion[] = items.map((item, index) => {
    const distractors = items
      .filter((candidate) => candidate.id !== item.id)
      .map((candidate) => candidate.englishDefinition)
      .filter(Boolean)
      .slice(0, 3);
    const fallbackDistractors = [
      'A grammar marker used to connect sentence parts.',
      'A short expression used only in casual conversation.',
      'A punctuation rule for separating independent clauses.',
    ];
    const options = rotateCorrectAnswerAwayFromFirst(
      [
        { text: item.englishDefinition, isCorrect: true },
        ...[...distractors, ...fallbackDistractors].map((text) => ({
          text,
          isCorrect: false,
        })),
      ].slice(0, 4),
      `${item.word}:${index}`
    );

    return {
      type: 'multiple_choice',
      prompt: `Which definition matches "${item.word}"?`,
      options: options.map((option, optionIndex) => ({
        id: `q${index + 1}-option-${optionIndex + 1}`,
        text: option.text,
        isCorrect: option.isCorrect,
      })),
      explanation: `${item.word}: ${item.vietnameseTranslation} ${item.exampleSentence}`,
    };
  });

  return {
    quiz: {
      title: 'Wordbank Review',
      description: 'Review due words from your Wordbank.',
      type: 'multiple_choice',
      questions,
    },
    wordMap: items.map((item, questionIndex) => ({
      questionIndex,
      savedVocabularyId: item.id,
    })),
  };
}

function answersRecordToMap(answers: Record<string, StudentAnswer>) {
  const studentAnswers: StudentAnswers = new Map();

  for (const [index, answer] of Object.entries(answers)) {
    const parsedIndex = Number.parseInt(index, 10);
    if (!Number.isNaN(parsedIndex)) {
      studentAnswers.set(parsedIndex, answer);
    }
  }

  return studentAnswers;
}

export async function createReviewSession(
  userId: string,
  input: CreateReviewSessionInput = {}
): Promise<WordbankReviewSessionResult> {
  const now = input.now ?? new Date();
  const dueRows = await prisma.savedVocabulary.findMany({
    where: {
      userId,
      nextReviewAt: { lte: now },
      ...(input.listId
        ? { listItems: { some: { listId: input.listId, list: { userId } } } }
        : {}),
    },
    orderBy: [
      { masteryLevel: 'asc' },
      { nextReviewAt: 'asc' },
      { savedAt: 'desc' },
    ],
    take: input.limit ?? 10,
    include: savedVocabularyListInclude,
  });
  const dueItems = dueRows.map(toSavedVocabularyItem);

  if (dueItems.length === 0) {
    throw new Error('No due words available for review');
  }

  const { quiz, wordMap } = buildReviewQuiz(dueItems);
  const clientQuiz = stripQuizAnswers(quiz);
  const session = await prisma.wordbankReviewSession.create({
    data: {
      userId,
      status: 'ACTIVE',
      quiz: quiz as unknown as Prisma.InputJsonValue,
      clientQuiz: clientQuiz as unknown as Prisma.InputJsonValue,
      wordMap: wordMap as unknown as Prisma.InputJsonValue,
    },
  });

  return {
    sessionId: session.id,
    quiz: clientQuiz,
    dueCount: dueItems.length,
  };
}

export async function submitReviewSession(
  userId: string,
  sessionId: string,
  input: SubmitReviewSessionInput
): Promise<SubmitReviewSessionResult> {
  const now = input.now ?? new Date();

  return prisma.$transaction(async (tx) => {
    const session = await tx.wordbankReviewSession.findFirst({
      where: { id: sessionId, userId, status: 'ACTIVE' },
    });

    if (!session) {
      throw new Error('Review session not found');
    }

    const claim = await tx.wordbankReviewSession.updateMany({
      where: { id: sessionId, userId, status: 'ACTIVE' },
      data: { status: 'COMPLETED', completedAt: now },
    });

    if (claim.count === 0) {
      throw new Error('Review session not found');
    }

    const quiz = session.quiz as unknown as QuizContent;
    const wordMap = session.wordMap as unknown as ReviewWordMapItem[];
    const scoreResult = calculateScore(answersRecordToMap(input.answers), {
      type: quiz.type,
      constraints: { minQuestions: 1, maxQuestions: 100 },
      scoring: { pointsPerQuestion: 10 },
      questions: quiz.questions,
    });

    await tx.wordbankReviewAttempt.create({
      data: {
        sessionId,
        userId,
        answers: input.answers as unknown as Prisma.InputJsonValue,
        score: scoreResult.earnedPoints,
        maxScore: scoreResult.totalPoints,
        percentage: scoreResult.percentage,
        results:
          scoreResult.questionResults as unknown as Prisma.InputJsonValue,
      },
    });

    const vocabularyIds = wordMap.map((item) => item.savedVocabularyId);
    const savedRows = await tx.savedVocabulary.findMany({
      where: { id: { in: vocabularyIds }, userId },
    });
    const savedVocabularyById = new Map(
      savedRows.map((item) => [item.id, item])
    );
    const masteryResults = wordMap.flatMap((item) => {
      const savedVocabulary = savedVocabularyById.get(item.savedVocabularyId);
      if (!savedVocabulary) return [];

      const result = scoreResult.questionResults.find(
        (questionResult) => questionResult.questionIndex === item.questionIndex
      );
      const previousMasteryLevel = savedVocabulary.masteryLevel ?? 0;
      const nextMasteryLevel = result?.isCorrect
        ? clampMasteryLevel(previousMasteryLevel + 1)
        : 0;

      return {
        savedVocabularyId: item.savedVocabularyId,
        word: savedVocabulary.word,
        englishDefinition: savedVocabulary.englishDefinition,
        vietnameseTranslation: savedVocabulary.vietnameseTranslation,
        previousMasteryLevel,
        nextMasteryLevel,
        isCorrect: Boolean(result?.isCorrect),
      };
    });

    await Promise.all(
      masteryResults.map((result) =>
        tx.savedVocabulary.updateMany({
          where: { id: result.savedVocabularyId, userId },
          data: {
            masteryLevel: result.nextMasteryLevel,
            nextReviewAt: getNextReviewDate(result.nextMasteryLevel, now),
          },
        })
      )
    );

    return {
      ...scoreResult,
      reviewQuestions: quiz.questions,
      masteryResults,
    };
  });
}
