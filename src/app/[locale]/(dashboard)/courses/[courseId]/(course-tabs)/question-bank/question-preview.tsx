'use client';

import {
  DragAndDrop,
  Essay,
  FillInTheBlank,
  MultipleChoice,
  TrueFalse,
} from '@/components/quiz/questions';
import type { QuestionBankEntry } from '@/lib/quiz-template';
import { MatchingPreview } from './_components/matching-preview';
import { OrderingPreview } from './_components/ordering-preview';

interface QuestionPreviewProps {
  question: QuestionBankEntry;
}

/**
 * Renders a question showing the correct answer immediately.
 * For matching: neutral colors with purple connecting lines.
 * For ordering: neutral colors with order numbers.
 */
export function QuestionPreview({ question }: QuestionPreviewProps) {
  const data = question.answerData;
  const noop = () => {};

  switch (data.type) {
    case 'multiple_choice': {
      const correctId = data.options.find((o) => o.isCorrect)?.id;
      return (
        <MultipleChoice
          question={data}
          selectedOptionId={correctId}
          onSelect={noop}
          showResult={true}
        />
      );
    }

    case 'true_false':
      return (
        <TrueFalse
          question={data}
          selectedAnswer={data.correctAnswer}
          onSelect={noop}
          showResult={true}
        />
      );

    case 'fill_in_the_blank': {
      const filledBlanks: Record<string, string> = {};
      for (const blank of data.blanks) {
        filledBlanks[blank.id] = blank.acceptableAnswers[0] ?? '';
      }
      return (
        <FillInTheBlank
          question={data}
          filledBlanks={filledBlanks}
          onFill={noop}
          showResult={true}
        />
      );
    }

    case 'matching':
      return <MatchingPreview question={data} />;

    case 'ordering':
      return <OrderingPreview question={data} />;

    case 'essay':
      return (
        <Essay
          question={data}
          text=""
          onTextChange={noop}
          showResult={true}
          disabled={true}
        />
      );

    case 'drag_and_drop':
      return (
        <DragAndDrop
          question={data}
          placements={data.correctMapping}
          onPlace={noop}
          showResult={true}
          disabled={true}
        />
      );

    default:
      return null;
  }
}
