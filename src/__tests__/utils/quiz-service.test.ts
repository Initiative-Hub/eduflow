import { beforeEach, describe, expect, it, vi } from 'vitest';
import { quizService } from '@/app/[locale]/(dashboard)/courses/[courseId]/(course-tabs)/quiz/quiz.service';
import { apiClient } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  apiClient: {
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('quizService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a manual quiz shell before asking AI to generate the quiz', async () => {
    const createdQuiz = {
      id: 'quiz-1',
      courseId: 'course-1',
      lessonIds: ['lesson-1'],
      title: 'Unit Review',
      description: '',
      questionCounts: {
        MULTIPLE_CHOICE: 2,
        TRUE_FALSE: 1,
      },
      deliveryMode: 'INSTANT_FEEDBACK',
      selectionMethod: 'MANUAL_CREATE',
      questionCount: 3,
      questions: [],
      createdAt: '2026-06-29T00:00:00.000Z',
      updatedAt: '2026-06-29T00:00:00.000Z',
    };
    const generatedQuiz = {
      ...createdQuiz,
      questions: [{ type: 'multiple_choice', prompt: 'Generated question' }],
      questionCount: 1,
    };

    vi.mocked(apiClient.post)
      .mockResolvedValueOnce(createdQuiz)
      .mockResolvedValueOnce(generatedQuiz);

    const result = await (quizService as any).createGeneratedQuiz('course-1', {
      lessonIds: ['lesson-1'],
      title: 'Unit Review',
      description: undefined,
      questionCounts: {
        MULTIPLE_CHOICE: 2,
        TRUE_FALSE: 1,
      },
      deliveryMode: 'INSTANT_FEEDBACK',
      selectionMethod: 'HAND_PICK',
      questionCount: 3,
    });

    expect(apiClient.post).toHaveBeenNthCalledWith(
      1,
      'v1/courses/course-1/quizzes',
      {
        lessonIds: ['lesson-1'],
        title: 'Unit Review',
        description: undefined,
        questionCounts: {
          MULTIPLE_CHOICE: 2,
          TRUE_FALSE: 1,
        },
        deliveryMode: 'INSTANT_FEEDBACK',
        selectionMethod: 'MANUAL_CREATE',
        questionCount: 3,
        questions: [],
      }
    );
    expect(apiClient.post).toHaveBeenNthCalledWith(2, 'v1/ai/quiz', {
      quizId: 'quiz-1',
    });
    expect(result).toBe(generatedQuiz);
  });

  it('saves ordered question-bank references alongside edited questions', async () => {
    vi.mocked(apiClient.put).mockResolvedValue({ id: 'quiz-1' });

    await quizService.saveQuestions(
      'quiz-1',
      [{ type: 'true_false', prompt: 'The sky is blue', correctAnswer: true }],
      ['question-1']
    );

    expect(apiClient.put).toHaveBeenCalledWith('v1/quizzes/quiz-1/questions', {
      questionIds: ['question-1'],
      questions: [
        { type: 'true_false', prompt: 'The sky is blue', correctAnswer: true },
      ],
    });
  });

  it('deletes a quiz through its resource endpoint', async () => {
    vi.mocked(apiClient.delete).mockResolvedValue(undefined);

    await quizService.deleteQuiz('quiz-1');

    expect(apiClient.delete).toHaveBeenCalledWith('v1/quizzes/quiz-1');
  });
});
