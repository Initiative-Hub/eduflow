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
  CheckReviewSessionAnswerInput,
  CheckReviewSessionAnswerResult,
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

function getMeaningText(item: SavedVocabularyItem): string {
  const eng = item.englishDefinition?.trim();
  const vn = item.vietnameseTranslation?.trim();
  if (eng && eng.toLowerCase() !== item.word.toLowerCase() && vn) {
    return `${vn} (${eng})`;
  }
  return vn || eng || item.word;
}

function getExampleText(item: SavedVocabularyItem): string | null {
  if (
    item.exampleSentence &&
    !item.exampleSentence.startsWith('Example sentence for')
  ) {
    return item.exampleSentence;
  }
  if (item.examples && item.examples.length > 0) {
    return item.examples[0];
  }
  return null;
}

function buildReviewQuiz(items: SavedVocabularyItem[]): {
  quiz: QuizContent;
  wordMap: ReviewWordMapItem[];
} {
  const questions: MultipleChoiceQuestion[] = items.map((item, index) => {
    const rawExample = getExampleText(item);
    const hasValidExample = Boolean(rawExample && rawExample.trim().length > 5);

    // Alternate question types: If item has an example, alternate between Example test and Meaning test
    const testExample = hasValidExample && index % 2 === 1;

    if (testExample && rawExample) {
      const escapedWord = item.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const wordRegex = new RegExp(`\\b${escapedWord}\\b`, 'gi');
      const containsWord = new RegExp(`\\b${escapedWord}\\b`, 'i').test(
        rawExample
      );

      if (containsWord) {
        // Masked fill-in-the-blank example question
        const maskedPrompt = rawExample.replace(wordRegex, '_____');
        const distractors = items
          .filter((candidate) => candidate.id !== item.id)
          .map((candidate) => candidate.word)
          .filter(Boolean)
          .slice(0, 3);

        const fallbackWords = [
          'acquire',
          'comprehend',
          'express',
          'demonstrate',
        ];
        const options = rotateCorrectAnswerAwayFromFirst(
          [
            { text: item.word, isCorrect: true },
            ...[...distractors, ...fallbackWords].map((text) => ({
              text,
              isCorrect: false,
            })),
          ].slice(0, 4),
          `${item.word}:ex:${index}`
        );

        return {
          type: 'multiple_choice',
          prompt: `Complete the example sentence: "${maskedPrompt}"`,
          options: options.map((option, optionIndex) => ({
            id: `q${index + 1}-option-${optionIndex + 1}`,
            text: option.text,
            isCorrect: option.isCorrect,
          })),
          explanation: `${item.word}\nMeaning: ${item.vietnameseTranslation}\nExample: "${rawExample}"`,
        };
      }

      // Match example sentence question
      const distractors = items
        .filter((candidate) => candidate.id !== item.id)
        .map(
          (candidate) => getExampleText(candidate) || getMeaningText(candidate)
        )
        .filter(Boolean)
        .slice(0, 3);

      const fallbackExamples = [
        'She practiced speaking English every morning.',
        'They completed the assignment before the deadline.',
        'The teacher explained the concept with clarity.',
      ];

      const options = rotateCorrectAnswerAwayFromFirst(
        [
          { text: rawExample, isCorrect: true },
          ...[...distractors, ...fallbackExamples].map((text) => ({
            text,
            isCorrect: false,
          })),
        ].slice(0, 4),
        `${item.word}:exmatch:${index}`
      );

      return {
        type: 'multiple_choice',
        prompt: `Which example sentence matches "${item.word}"?`,
        options: options.map((option, optionIndex) => ({
          id: `q${index + 1}-option-${optionIndex + 1}`,
          text: option.text,
          isCorrect: option.isCorrect,
        })),
        explanation: `${item.word}\nMeaning: ${item.vietnameseTranslation}\nExample: "${rawExample}"`,
      };
    }

    // Default Question Type: Meaning / Translation test
    const itemMeaning = getMeaningText(item);
    const distractors = items
      .filter((candidate) => candidate.id !== item.id)
      .map((candidate) => getMeaningText(candidate))
      .filter((text) => Boolean(text) && text !== itemMeaning)
      .slice(0, 3);

    const fallbackMeanings = [
      'Một quy tắc ngữ pháp trong tiếng Anh',
      'Từ chỉ hành động hoặc trạng thái',
      'Cụm từ dùng trong giao tiếp hằng ngày',
    ];

    const options = rotateCorrectAnswerAwayFromFirst(
      [
        { text: itemMeaning, isCorrect: true },
        ...[...distractors, ...fallbackMeanings].map((text) => ({
          text,
          isCorrect: false,
        })),
      ].slice(0, 4),
      `${item.word}:meaning:${index}`
    );

    return {
      type: 'multiple_choice',
      prompt: `Which meaning matches "${item.word}"?`,
      options: options.map((option, optionIndex) => ({
        id: `q${index + 1}-option-${optionIndex + 1}`,
        text: option.text,
        isCorrect: option.isCorrect,
      })),
      explanation: `${item.word} (${item.ipa ?? ''})\nNghĩa: ${item.vietnameseTranslation}\n${item.englishDefinition}`,
    };
  });

  return {
    quiz: {
      title: 'Wordbank Review',
      description: 'Review due words and example sentences from your Wordbank.',
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
  const selectedVocabularyIds = Array.from(new Set(input.vocabularyIds ?? []));
  const reviewRows =
    selectedVocabularyIds.length > 0
      ? await prisma.savedVocabulary.findMany({
          where: {
            id: { in: selectedVocabularyIds },
            userId,
          },
          include: savedVocabularyListInclude,
        })
      : await prisma.savedVocabulary.findMany({
          where: {
            userId,
            nextReviewAt: { lte: now },
            ...(input.listId
              ? {
                  listItems: {
                    some: { listId: input.listId, list: { userId } },
                  },
                }
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
  const sortedReviewRows =
    selectedVocabularyIds.length > 0
      ? selectedVocabularyIds.flatMap((id) => {
          const row = reviewRows.find((item) => item.id === id);
          return row ? [row] : [];
        })
      : reviewRows;
  const dueItems = sortedReviewRows.map(toSavedVocabularyItem);

  if (dueItems.length === 0) {
    throw new Error(
      selectedVocabularyIds.length > 0
        ? 'No selected words available for review'
        : 'No due words available for review'
    );
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

export async function checkReviewSessionAnswer(
  userId: string,
  sessionId: string,
  input: CheckReviewSessionAnswerInput
): Promise<CheckReviewSessionAnswerResult> {
  const session = await prisma.wordbankReviewSession.findFirst({
    where: { id: sessionId, userId, status: 'ACTIVE' },
  });

  if (!session) {
    throw new Error('Review session not found');
  }

  const quiz = session.quiz as unknown as QuizContent;
  const reviewQuestion = quiz.questions[input.questionIndex];

  if (!reviewQuestion) {
    throw new Error('Review question not found');
  }

  const scoreResult = calculateScore(new Map([[0, input.answer]]), {
    type: quiz.type,
    constraints: { minQuestions: 1, maxQuestions: 100 },
    scoring: { pointsPerQuestion: 10 },
    questions: [reviewQuestion],
  });

  return {
    isCorrect: scoreResult.questionResults[0]?.isCorrect ?? false,
    reviewQuestion,
  };
}
