'use client';

import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Quiz } from '@/components/quiz';
import { Badge } from '@/components/ui/badge';
import type { QuizContent, ScoreResult } from '@/lib/quiz-template';
import {
  QUESTION_SUB_TYPE_LABELS,
  QUIZ_CATEGORIES,
  stripQuizAnswers,
} from '@/lib/quiz-template';

// ─── Selection-Based Examples ────────────────────────────────────────────────

const multipleChoiceExample: QuizContent = {
  title: 'Multiple Choice Example',
  description: 'Students pick one correct answer from provided options.',
  type: 'multiple-choice',
  questions: [
    {
      type: 'multiple_choice',
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
  ],
};

const trueFalseExample: QuizContent = {
  title: 'True/False Example',
  description: 'Students choose between two binary options.',
  type: 'true_false',
  questions: [
    {
      type: 'true_false',
      prompt: 'Photosynthesis occurs only in the leaves of a plant.',
      correctAnswer: false,
      explanation:
        'Photosynthesis can occur in any green part of the plant that contains chloroplasts, including stems and unripe fruits.',
    },
  ],
};

const matchingExample: QuizContent = {
  title: 'Matching Example',
  description: 'Students match items from two columns into correct pairs.',
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

const orderingExample: QuizContent = {
  title: 'Ordering Example',
  description: 'Students arrange items in the correct sequence.',
  type: 'ordering',
  questions: [
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

// ─── Open-Ended Examples ─────────────────────────────────────────────────────

const essayExample: QuizContent = {
  title: 'Essay Example',
  description:
    'Students write paragraphs of text; AI evaluates and provides feedback.',
  type: 'essay',
  questions: [
    {
      type: 'essay',
      prompt:
        'Explain how energy flows through a food chain, starting from producers to top-level consumers. Include at least one specific example.',
      minWords: 50,
      maxWords: 300,
      allowAttachments: true,
      deliveryOption: 'immediate',
      allowTeacherRubric: true,
      explanation:
        'Energy flows from the sun to producers (plants), then to primary consumers (herbivores), secondary consumers (carnivores), and tertiary consumers (top predators).',
    },
  ],
};

const fillInTheBlankExample: QuizContent = {
  title: 'Fill in the Blank Example',
  description: 'Students type short answers into blanks within a sentence.',
  type: 'fill_in_the_blank',
  questions: [
    {
      type: 'fill_in_the_blank',
      promptTemplate:
        'Plants use {{pigment}} to capture sunlight. This process takes place inside organelles called {{organelle}}.',
      blanks: [
        { id: 'pigment', acceptableAnswers: ['chlorophyll'] },
        { id: 'organelle', acceptableAnswers: ['chloroplasts', 'chloroplast'] },
      ],
      explanation:
        'Chlorophyll is the pigment that captures light energy, and it is located within chloroplasts in plant cells.',
    },
  ],
};

const dragAndDropExample: QuizContent = {
  title: 'Drag & Drop Fill Example',
  description:
    'Students drag items into sentence blanks (similar to fill-in-the-blank but with drag-and-drop interaction).',
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
  ],
};

// ─── Sub-Type Descriptions ───────────────────────────────────────────────────

const SUB_TYPE_DESCRIPTIONS: Record<string, string> = {
  'multiple-choice':
    'Best for testing factual recall and comprehension. Students select one correct answer from multiple options. Use when there is a single clear correct answer.',
  'true-false':
    'Best for testing understanding of statements and concepts. Students decide if a statement is true or false. Use for quick checks of common misconceptions.',
  matching:
    'Best for testing associations and relationships. Students match items from two columns. Use when testing vocabulary, definitions, or cause-effect relationships.',
  ordering:
    'Best for testing sequential knowledge. Students arrange items in the correct order. Use for processes, timelines, or ranked lists.',
  essay:
    'Best for testing deep understanding and critical thinking. Students write extended responses. AI provides feedback based on rubric criteria.',
  'fill-in-the-blank':
    'Best for testing specific terminology and key concepts. Students type short answers into blanks. Use when exact recall of terms is important.',
  'drag-and-drop':
    'Best for interactive sentence completion. Students drag items into blanks. Use when you want a more engaging alternative to fill-in-the-blank.',
};

// ─── Component ───────────────────────────────────────────────────────────────

export function QuizDemo() {
  const t = useTranslations('Courses.QuestionTypesPreview');

  const handleComplete = (result: ScoreResult) => {
    toast.success(`Score: ${Math.round(result.percentage)}%`);
  };

  const selectionExamples = [
    { key: 'multiple-choice', quiz: multipleChoiceExample },
    { key: 'true-false', quiz: trueFalseExample },
    { key: 'matching', quiz: matchingExample },
    { key: 'ordering', quiz: orderingExample },
  ];

  const openEndedExamples = [
    { key: 'essay', quiz: essayExample },
    { key: 'fill-in-the-blank', quiz: fillInTheBlankExample },
    { key: 'drag-and-drop', quiz: dragAndDropExample },
  ];

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-bold text-2xl text-foreground">{t('title')}</h1>
        <p className="mt-1 text-muted-foreground text-sm">{t('description')}</p>
      </div>

      {/* Selection-Based Section */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold text-foreground text-lg">
            {QUIZ_CATEGORIES['SELECTION_BASED'].label}
          </h2>
          <Badge variant="secondary" className="text-xs">
            {QUIZ_CATEGORIES['SELECTION_BASED'].description}
          </Badge>
        </div>

        {selectionExamples.map(({ key, quiz }) => (
          <div key={key} className="space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-foreground">
                {
                  QUESTION_SUB_TYPE_LABELS[
                    key as keyof typeof QUESTION_SUB_TYPE_LABELS
                  ]
                }
              </h3>
            </div>
            <p className="mb-2 text-muted-foreground text-xs">
              {SUB_TYPE_DESCRIPTIONS[key]}
            </p>
            <Quiz
              quiz={stripQuizAnswers(quiz)}
              quizWithAnswers={quiz}
              onComplete={handleComplete}
            />
          </div>
        ))}
      </section>

      {/* Open-Ended Section */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold text-foreground text-lg">
            {QUIZ_CATEGORIES['OPEN_ENDED'].label}
          </h2>
          <Badge variant="secondary" className="text-xs">
            {QUIZ_CATEGORIES['OPEN_ENDED'].description}
          </Badge>
        </div>

        {openEndedExamples.map(({ key, quiz }) => (
          <div key={key} className="space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-foreground">
                {
                  QUESTION_SUB_TYPE_LABELS[
                    key as keyof typeof QUESTION_SUB_TYPE_LABELS
                  ]
                }
              </h3>
            </div>
            <p className="mb-2 text-muted-foreground text-xs">
              {SUB_TYPE_DESCRIPTIONS[key]}
            </p>
            <Quiz
              quiz={stripQuizAnswers(quiz)}
              quizWithAnswers={quiz}
              onComplete={handleComplete}
            />
          </div>
        ))}
      </section>
    </div>
  );
}
