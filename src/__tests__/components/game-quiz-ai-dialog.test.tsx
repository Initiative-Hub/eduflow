import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { gameQuizApi } from '@/components/game-quiz/api';
import { gameQuizCopy } from '@/components/game-quiz/copy';
import { GameQuizAiDialog } from '@/components/game-quiz/ai/game-quiz-ai-dialog';
import type { GeneratedGameQuizQuestion } from '@/components/game-quiz/types';

vi.mock('@/components/game-quiz/api', () => ({
  gameQuizApi: {
    getAiSources: vi.fn(),
    generateAiQuestions: vi.fn(),
  },
}));

const courseId = '11111111-1111-4111-8111-111111111111';
const lessonId = '22222222-2222-4222-8222-222222222222';
const generatedQuestion = {
  prompt: 'Which planet is known as the Red Planet?',
  hint: 'Recall the planet with an iron-rich surface.',
  explanation: 'Mars looks red because iron minerals oxidize.',
  timerSeconds: 30,
  maxPoints: 1500,
  options: [
    { text: 'Mars', isCorrect: true },
    { text: 'Venus', isCorrect: false },
  ],
};

function renderDialog(overrides?: {
  onAccept?: (questions: GeneratedGameQuizQuestion[]) => void;
  onOpenChange?: (open: boolean) => void;
}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const onAccept =
    overrides?.onAccept ??
    vi.fn<(questions: GeneratedGameQuizQuestion[]) => void>();
  const onOpenChange =
    overrides?.onOpenChange ?? vi.fn<(open: boolean) => void>();

  render(
    <QueryClientProvider client={queryClient}>
      <GameQuizAiDialog
        copy={gameQuizCopy}
        difficulty="HARD"
        isOpen
        maxQuestionCount={8}
        onAccept={onAccept}
        onOpenChange={onOpenChange}
        topic="Solar system"
      />
    </QueryClientProvider>
  );

  return { onAccept, onOpenChange };
}

async function selectSource(user: ReturnType<typeof userEvent.setup>) {
  const courseSelect = await screen.findByRole('combobox', {
    name: 'aiGenerate.courseLabel',
  });
  courseSelect.focus();
  await user.keyboard('{ArrowDown}{Enter}');
  await user.click(screen.getByRole('checkbox', { name: 'Planets' }));
  await user.click(
    screen.getByRole('button', { name: /aiGenerate\.continue/i })
  );
}

describe('GameQuizAiDialog', () => {
  beforeAll(() => {
    HTMLElement.prototype.scrollIntoView = vi.fn();
    HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
    HTMLElement.prototype.setPointerCapture = vi.fn();
    HTMLElement.prototype.releasePointerCapture = vi.fn();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(gameQuizApi.getAiSources).mockResolvedValue({
      courses: [
        {
          id: courseId,
          title: 'Astronomy',
          modules: [
            {
              id: '33333333-3333-4333-8333-333333333333',
              title: 'Module 1',
              lessons: [{ id: lessonId, title: 'Planets' }],
            },
          ],
        },
        {
          id: '44444444-4444-4444-8444-444444444444',
          title: 'Physics',
          modules: [
            {
              id: '55555555-5555-4555-8555-555555555555',
              title: 'Module 2',
              lessons: [
                {
                  id: '66666666-6666-4666-8666-666666666666',
                  title: 'Motion',
                },
              ],
            },
          ],
        },
      ],
    });
    vi.mocked(gameQuizApi.generateAiQuestions).mockResolvedValue({
      questions: [generatedQuestion],
    });
  });

  it('builds the contextual request and keeps generated questions read-only until accepted', async () => {
    const user = userEvent.setup();
    const { onAccept, onOpenChange } = renderDialog();
    await selectSource(user);

    await user.type(
      screen.getByLabelText('aiGenerate.additionalPromptLabel'),
      'Focus on causes.'
    );
    await user.click(
      screen.getByRole('button', { name: 'aiGenerate.generate' })
    );

    await screen.findByText(generatedQuestion.prompt);
    expect(gameQuizApi.generateAiQuestions).toHaveBeenCalledWith({
      courseId,
      lessonIds: [lessonId],
      questionCount: 5,
      additionalPrompt: 'Focus on causes.',
      topic: 'Solar system',
      difficulty: 'HARD',
    });
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByText(generatedQuestion.hint)).toBeInTheDocument();
    expect(screen.getByText(generatedQuestion.explanation)).toBeInTheDocument();
    expect(screen.getByText('30 editor.seconds')).toBeInTheDocument();
    expect(screen.getByText('1500 preview.points')).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: /aiGenerate\.accept/i })
    );
    expect(onAccept).toHaveBeenCalledWith([generatedQuestion]);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('rejects transient results while retaining source and guidance inputs', async () => {
    const user = userEvent.setup();
    renderDialog();
    await selectSource(user);

    const guidance = screen.getByLabelText('aiGenerate.additionalPromptLabel');
    await user.type(guidance, 'Use conceptual questions.');
    await user.click(
      screen.getByRole('button', { name: 'aiGenerate.generate' })
    );
    await screen.findByText(generatedQuestion.prompt);

    await user.click(screen.getByRole('button', { name: 'aiGenerate.reject' }));
    expect(
      screen.queryByText(generatedQuestion.prompt)
    ).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Planets' })).toBeChecked();

    await user.click(
      screen.getByRole('button', { name: /aiGenerate\.continue/i })
    );
    expect(
      screen.getByLabelText('aiGenerate.additionalPromptLabel')
    ).toHaveValue('Use conceptual questions.');
  });

  it('clears lessons that do not belong to a newly selected course', async () => {
    const user = userEvent.setup();
    renderDialog();
    await selectSource(user);
    await user.click(screen.getByRole('button', { name: /common\.back/i }));

    const courseSelect = screen.getByRole('combobox', {
      name: 'aiGenerate.courseLabel',
    });
    await user.click(courseSelect);
    await user.click(screen.getByRole('option', { name: 'Physics' }));

    expect(
      screen.queryByRole('checkbox', { name: 'Planets' })
    ).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Motion' })).not.toBeChecked();
    expect(
      screen.getByRole('button', { name: /aiGenerate\.continue/i })
    ).toBeDisabled();
  });

  it('keeps a failed generation on guidance with a visible retry action', async () => {
    vi.mocked(gameQuizApi.generateAiQuestions).mockRejectedValueOnce(
      new Error('Provider temporarily unavailable')
    );
    const user = userEvent.setup();
    renderDialog();
    await selectSource(user);

    await user.click(
      screen.getByRole('button', { name: 'aiGenerate.generate' })
    );

    expect(
      await screen.findByText('Provider temporarily unavailable')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'aiGenerate.generate' })
    ).toBeEnabled();
    await waitFor(() =>
      expect(gameQuizApi.generateAiQuestions).toHaveBeenCalledTimes(1)
    );
  });
});
