import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { gameQuizApi } from '@/components/game-quiz/api';
import { gameQuizCopy } from '@/components/game-quiz/copy';
import { GameQuizEditorClient } from '@/components/game-quiz/game-quiz-editor-client';

vi.mock('@/components/game-quiz/api', () => ({
  gameQuizApi: {
    get: vi.fn(),
    create: vi.fn(),
    saveQuestions: vi.fn(),
    createSession: vi.fn(),
    getAiSources: vi.fn(),
    generateAiQuestions: vi.fn(),
  },
}));

const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
}));

function renderEditor(gameQuizId?: string) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <GameQuizEditorClient copy={gameQuizCopy} gameQuizId={gameQuizId} />
    </QueryClientProvider>
  );
}

describe('GameQuizEditorClient', () => {
  beforeAll(() => {
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(gameQuizApi.getAiSources).mockResolvedValue({
      courses: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          title: 'Astronomy',
          modules: [
            {
              id: '22222222-2222-4222-8222-222222222222',
              title: 'Module 1',
              lessons: [
                {
                  id: '33333333-3333-4333-8333-333333333333',
                  title: 'Planets',
                },
              ],
            },
          ],
        },
      ],
    });
    vi.mocked(gameQuizApi.generateAiQuestions).mockResolvedValue({
      questions: [
        {
          prompt: 'Which planet is known as the Red Planet?',
          hint: 'Think about its surface color.',
          explanation: 'Iron oxides make Mars appear red.',
          timerSeconds: 30,
          maxPoints: 1500,
          options: [
            { text: 'Mars', isCorrect: true },
            { text: 'Venus', isCorrect: false },
          ],
        },
      ],
    });
  });

  it('renders creation mode with initial question and handles prompt and option editing', () => {
    renderEditor();

    expect(screen.getByText('editor.title')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'editor.create' })
    ).toBeDisabled();

    // Fill Game Title
    const titleInput = screen.getByPlaceholderText('editor.titleLabel');
    fireEvent.change(titleInput, { target: { value: 'Solar System Rally' } });

    // Fill Question Prompt
    const promptInput = screen.getByPlaceholderText('editor.prompt...');
    fireEvent.change(promptInput, {
      target: { value: 'What is the closest planet to the Sun?' },
    });

    // Fill Answers A, B, C, D
    const answerInputs = screen.getAllByPlaceholderText(/editor\.answer/i);
    fireEvent.change(answerInputs[0], { target: { value: 'Mercury' } });
    fireEvent.change(answerInputs[1], { target: { value: 'Venus' } });
    fireEvent.change(answerInputs[2], { target: { value: 'Earth' } });
    fireEvent.change(answerInputs[3], { target: { value: 'Mars' } });

    // Now valid - Create button should be enabled
    const createButton = screen.getByRole('button', { name: 'editor.create' });
    expect(createButton).toBeEnabled();
  });

  it('allows adding, duplicating, and deleting questions', () => {
    renderEditor();

    // Initial has 1 question
    expect(screen.getByText('1 of 1')).toBeInTheDocument();

    // Add Question
    const addQuestionButtons = screen.getAllByRole('button', {
      name: 'editor.addQuestion',
    });
    fireEvent.click(addQuestionButtons[0]);

    expect(screen.getByText('2 of 2')).toBeInTheDocument();

    // Duplicate Active Question
    const duplicateButtons = screen.getAllByRole('button', {
      name: /editor\.duplicateQuestion/i,
    });
    fireEvent.click(duplicateButtons[0]);

    // Total questions should now be 3 (either 2 of 3 or 3 of 3)
    expect(screen.getByText(/of 3/)).toBeInTheDocument();

    // Delete Active Question
    const deleteButtons = screen.getAllByRole('button', {
      name: /editor\.removeQuestion/i,
    });
    fireEvent.click(deleteButtons[0]);

    // Total questions should be back to 2
    expect(screen.getByText(/of 2/)).toBeInTheDocument();
  });

  it('updates time limit and max points using quick presets', () => {
    renderEditor();

    // Click 30s preset
    const preset30s = screen.getByRole('button', { name: '30s' });
    fireEvent.click(preset30s);

    const timeInput = screen.getByLabelText('editor.timeLimit');
    expect(timeInput).toHaveValue(30);

    // Click points preset
    const preset2000 = screen.getByRole('button', { name: /2,?000/ });
    fireEvent.click(preset2000);

    const pointsInput = screen.getByLabelText('editor.maxPoints');
    expect(pointsInput).toHaveValue(2000);
  });

  it('replaces the pristine starter on AI accept and makes it editable without persisting', async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.click(screen.getByRole('button', { name: 'aiGenerate.action' }));
    const courseSelect = await screen.findByRole('combobox', {
      name: 'aiGenerate.courseLabel',
    });
    courseSelect.focus();
    await user.keyboard('{ArrowDown}{Enter}');
    await user.click(screen.getByRole('checkbox', { name: 'Planets' }));
    await user.click(
      screen.getByRole('button', { name: /aiGenerate\.continue/i })
    );
    await user.click(
      screen.getByRole('button', { name: 'aiGenerate.generate' })
    );
    await screen.findByText('Which planet is known as the Red Planet?');
    await user.click(
      screen.getByRole('button', { name: /aiGenerate\.accept/i })
    );

    const promptInput = screen.getByPlaceholderText('editor.prompt...');
    expect(promptInput).toHaveValue('Which planet is known as the Red Planet?');
    expect(screen.getByText('1 of 1')).toBeInTheDocument();
    await user.clear(promptInput);
    await user.type(promptInput, 'Which world is called the Red Planet?');
    expect(promptInput).toHaveValue('Which world is called the Red Planet?');
    expect(gameQuizApi.create).not.toHaveBeenCalled();
    expect(gameQuizApi.saveQuestions).not.toHaveBeenCalled();
  });
});
