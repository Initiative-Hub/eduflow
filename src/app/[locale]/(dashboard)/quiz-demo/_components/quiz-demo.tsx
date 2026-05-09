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
        'Plants use {{pigment}} to capture sunlight. This process takes place inside organelles called {{organelle}}.',
      blanks: [
        {
          id: 'pigment',
          acceptableAnswers: ['chlorophyll'],
        },
        {
          id: 'organelle',
          acceptableAnswers: ['chloroplasts', 'chloroplast'],
        },
      ],
      explanation:
        'Chlorophyll is the pigment that captures light energy, and it is located within chloroplasts in plant cells.',
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

const mockDragAndDrop: QuizContent = {
  title: 'Plant Biology – Fill in the Blanks',
  description:
    'Drag the correct terms into the blanks to complete each sentence about plant biology.',
  type: 'drag-and-drop',
  questions: [
    {
      type: 'drag-and-drop',
      prompt: 'Complete the sentence about photosynthesis:',
      sentenceTemplate:
        'During photosynthesis, plants absorb {{gas}} from the atmosphere and {{liquid}} from the soil to produce {{product}} and release {{byproduct}}.',
      zones: [
        { id: 'gas', label: 'gas' },
        { id: 'liquid', label: 'liquid' },
        { id: 'product', label: 'product' },
        { id: 'byproduct', label: 'byproduct' },
      ],
      items: [
        { id: 'co2', text: 'Carbon dioxide' },
        { id: 'water', text: 'Water' },
        { id: 'glucose', text: 'Glucose' },
        { id: 'oxygen', text: 'Oxygen' },
        { id: 'nitrogen', text: 'Nitrogen' },
        { id: 'methane', text: 'Methane' },
      ],
      correctMapping: {
        gas: 'co2',
        liquid: 'water',
        product: 'glucose',
        byproduct: 'oxygen',
      },
      explanation:
        'Photosynthesis uses CO₂ and water as inputs, producing glucose for energy and releasing oxygen as a byproduct.',
    },
    {
      type: 'drag-and-drop',
      prompt: 'Complete the sentence about plant cell structure:',
      sentenceTemplate:
        'The {{wall}} provides structural support, while the {{vacuole}} stores water and nutrients. Energy is produced in the {{mitochondria}} and photosynthesis occurs in the {{chloroplast}}.',
      zones: [
        { id: 'wall', label: 'structure' },
        { id: 'vacuole', label: 'storage' },
        { id: 'mitochondria', label: 'energy' },
        { id: 'chloroplast', label: 'photosynthesis' },
      ],
      items: [
        { id: 'cell-wall', text: 'Cell wall' },
        { id: 'central-vacuole', text: 'Central vacuole' },
        { id: 'mitochondria', text: 'Mitochondria' },
        { id: 'chloroplast', text: 'Chloroplast' },
        { id: 'nucleus', text: 'Nucleus' },
      ],
      correctMapping: {
        wall: 'cell-wall',
        vacuole: 'central-vacuole',
        mitochondria: 'mitochondria',
        chloroplast: 'chloroplast',
      },
      explanation:
        'Plant cells have a rigid cell wall for support, a large central vacuole for storage, mitochondria for cellular respiration, and chloroplasts for photosynthesis.',
    },
  ],
};

const mockEssay: QuizContent = {
  title: 'Ecosystem Analysis',
  description:
    'Answer the following questions about ecosystems. You may attach supporting files.',
  type: 'essay',
  questions: [
    {
      type: 'essay',
      prompt:
        'Explain how energy flows through a food chain, starting from producers to top-level consumers. Include at least one specific example of a food chain.',
      minWords: 50,
      maxWords: 300,
      allowAttachments: true,
      deliveryOption: 'immediate',
      allowTeacherRubric: true,
      explanation:
        'Energy flows from the sun to producers (plants), then to primary consumers (herbivores), secondary consumers (carnivores), and tertiary consumers (top predators). At each level, about 90% of energy is lost as heat.',
    },
    {
      type: 'essay',
      prompt:
        'Describe the steps of the scientific method and explain why each step is important. Use an example of a real-world experiment to illustrate your answer.',
      minWords: 80,
      maxWords: 400,
      allowAttachments: true,
      deliveryOption: 'teacher-review',
      allowTeacherRubric: true,
      explanation:
        'The scientific method includes: observation, question, hypothesis, experiment, analysis, and conclusion. Each step builds on the previous one to ensure rigorous, reproducible results.',
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

      {/* Matching */}
      <section className="space-y-2">
        <h2 className="font-semibold text-foreground text-lg">Matching Quiz</h2>
        <Quiz quiz={mockMatching} onComplete={handleComplete} />
      </section>

      {/* Drag and Drop */}
      <section className="space-y-2">
        <h2 className="font-semibold text-foreground text-lg">
          Drag & Drop (Fill in the Blank)
        </h2>
        <Quiz quiz={mockDragAndDrop} onComplete={handleComplete} />
      </section>

      {/* Essay / Text-Based */}
      <section className="space-y-2">
        <h2 className="font-semibold text-foreground text-lg">
          Essay / Text-Based Quiz
        </h2>
        <p className="text-muted-foreground text-sm">
          Students write their answers and can attach files. Teachers can
          provide custom rubrics (text or file). AI evaluates responses with two
          delivery options: immediate feedback or teacher-reviewed.
        </p>
        <Quiz quiz={mockEssay} onComplete={handleComplete} />
      </section>
    </div>
  );
}
