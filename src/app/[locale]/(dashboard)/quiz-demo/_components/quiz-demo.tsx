'use client';

import { toast } from 'sonner';
import { Quiz } from '@/components/quiz';
import type { QuizContent, ScoreResult } from '@/lib/quiz-template';

const mockQuiz: QuizContent = {
  title: 'Photosynthesis Basics',
  description:
    'Test your understanding of how plants convert light energy into chemical energy.',
  type: 'multiple-choice',
  questions: [
    {
      type: 'multiple-choice',
      prompt: 'What is the primary pigment responsible for photosynthesis?',
      options: [
        { id: 'a', text: 'Chlorophyll', isCorrect: true },
        { id: 'b', text: 'Carotenoid', isCorrect: false },
        { id: 'c', text: 'Anthocyanin', isCorrect: false },
        { id: 'd', text: 'Xanthophyll', isCorrect: false },
      ],
      explanation:
        'Chlorophyll is the green pigment found in chloroplasts that absorbs light energy for photosynthesis.',
    },
    {
      type: 'true-false',
      prompt: 'Photosynthesis occurs only in the leaves of a plant.',
      correctAnswer: false,
      explanation:
        'Photosynthesis can occur in any green part of the plant that contains chloroplasts, including stems and unripe fruits.',
    },
    {
      type: 'multiple-choice',
      prompt: 'Which gas is released as a byproduct of photosynthesis?',
      options: [
        { id: 'a', text: 'Carbon dioxide', isCorrect: false },
        { id: 'b', text: 'Nitrogen', isCorrect: false },
        { id: 'c', text: 'Oxygen', isCorrect: true },
        { id: 'd', text: 'Hydrogen', isCorrect: false },
      ],
      explanation:
        'During the light reactions of photosynthesis, water molecules are split, releasing oxygen as a byproduct.',
    },
    {
      type: 'fill-in-the-blank',
      promptTemplate:
        'The overall equation for photosynthesis is: {{reactant1}} + {{reactant2}} → Glucose + Oxygen',
      blanks: [
        {
          id: 'reactant1',
          acceptableAnswers: ['Carbon dioxide', 'CO2', 'CO₂'],
        },
        { id: 'reactant2', acceptableAnswers: ['Water', 'H2O', 'H₂O'] },
      ],
      explanation: 'The simplified equation is: 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂',
    },
    {
      type: 'ordering',
      prompt: 'Arrange the steps of photosynthesis in the correct order:',
      items: [
        { id: 'step1', text: 'Light is absorbed by chlorophyll' },
        { id: 'step2', text: 'Water molecules are split' },
        { id: 'step3', text: 'ATP and NADPH are produced' },
        { id: 'step4', text: 'Carbon dioxide is fixed into glucose' },
      ],
      correctOrder: ['step1', 'step2', 'step3', 'step4'],
      explanation:
        'The light reactions (steps 1-3) occur first, followed by the Calvin cycle (step 4) which uses the products of the light reactions.',
    },
  ],
};

const mockFlashcards: QuizContent = {
  title: 'Biology Key Terms',
  description: 'Review important biology vocabulary with flashcards.',
  type: 'flashcard',
  questions: [
    {
      type: 'flashcard',
      front: 'What is mitosis?',
      back: 'A type of cell division that results in two daughter cells each having the same number and kind of chromosomes as the parent nucleus.',
    },
    {
      type: 'flashcard',
      front: 'What is ATP?',
      back: 'Adenosine triphosphate — the primary energy carrier molecule in cells, used to power cellular processes.',
    },
    {
      type: 'flashcard',
      front: 'What is the difference between prokaryotic and eukaryotic cells?',
      back: 'Prokaryotic cells lack a membrane-bound nucleus and organelles, while eukaryotic cells have both.',
    },
  ],
};

const mockMatching: QuizContent = {
  title: 'Cell Organelles',
  description: 'Match each organelle to its function.',
  type: 'matching',
  questions: [
    {
      type: 'matching',
      prompt: 'Match each organelle with its primary function:',
      leftItems: [
        { id: 'l1', text: 'Mitochondria' },
        { id: 'l2', text: 'Ribosome' },
        { id: 'l3', text: 'Golgi apparatus' },
        { id: 'l4', text: 'Lysosome' },
      ],
      rightItems: [
        { id: 'r1', text: 'Protein synthesis' },
        { id: 'r2', text: 'Cellular respiration' },
        { id: 'r3', text: 'Digestion of waste' },
        { id: 'r4', text: 'Packaging and shipping proteins' },
      ],
      correctPairs: [
        { leftId: 'l1', rightId: 'r2' },
        { leftId: 'l2', rightId: 'r1' },
        { leftId: 'l3', rightId: 'r4' },
        { leftId: 'l4', rightId: 'r3' },
      ],
      explanation:
        'Each organelle has a specialized role: mitochondria produce energy, ribosomes make proteins, Golgi packages them, and lysosomes break down waste.',
    },
  ],
};

export function QuizDemo() {
  const handleComplete = (result: ScoreResult) => {
    toast.success(`Quiz completed! Score: ${Math.round(result.percentage)}%`);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-bold text-2xl text-foreground">Quiz Demo</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          Preview of quiz components with mock data.
        </p>
      </div>

      {/* Mixed question types quiz */}
      <section className="space-y-2">
        <h2 className="font-semibold text-foreground text-lg">
          Mixed Quiz (Multiple Choice, True/False, Fill-in-the-Blank, Ordering)
        </h2>
        <Quiz quiz={mockQuiz} onComplete={handleComplete} />
      </section>

      {/* Flashcards */}
      <section className="space-y-2">
        <h2 className="font-semibold text-foreground text-lg">
          Flashcard Mode
        </h2>
        <Quiz quiz={mockFlashcards} />
      </section>

      {/* Matching */}
      <section className="space-y-2">
        <h2 className="font-semibold text-foreground text-lg">Matching Quiz</h2>
        <Quiz quiz={mockMatching} onComplete={handleComplete} />
      </section>
    </div>
  );
}
