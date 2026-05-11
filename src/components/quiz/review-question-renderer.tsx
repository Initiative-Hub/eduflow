'use client';

import type { QuizContent, StudentAnswer } from '@/lib/quiz-template/types';
import {
  DragAndDrop,
  Essay,
  FillInTheBlank,
  Matching,
  MultipleChoice,
  Ordering,
  TrueFalse,
} from './questions';

// ─── Review Question Renderer (read-only, shows results) ─────────────────────

interface ReviewQuestionRendererProps {
  question: QuizContent['questions'][number];
  answer?: StudentAnswer;
}

export function ReviewQuestionRenderer({
  question,
  answer,
}: ReviewQuestionRendererProps) {
  const noop = () => {};

  switch (question.type) {
    case 'multiple-choice':
      return (
        <MultipleChoice
          question={question}
          selectedOptionId={
            answer?.type === 'multiple-choice'
              ? answer.selectedOptionId
              : undefined
          }
          onSelect={noop}
          showResult={true}
        />
      );

    case 'true-false':
      return (
        <TrueFalse
          question={question}
          selectedAnswer={
            answer?.type === 'true-false' ? answer.selectedAnswer : undefined
          }
          onSelect={noop}
          showResult={true}
        />
      );

    case 'fill-in-the-blank':
      return (
        <FillInTheBlank
          question={question}
          filledBlanks={
            answer?.type === 'fill-in-the-blank' ? answer.filledBlanks : {}
          }
          onFill={noop}
          showResult={true}
        />
      );

    case 'matching':
      return (
        <Matching
          question={question}
          pairs={answer?.type === 'matching' ? answer.pairs : []}
          onMatch={noop}
          showResult={true}
          disabled={true}
        />
      );

    case 'ordering':
      return (
        <Ordering
          question={question}
          orderedItemIds={
            answer?.type === 'ordering'
              ? answer.orderedItemIds
              : question.items.map((item) => item.id)
          }
          onReorder={noop}
          showResult={true}
          disabled={true}
        />
      );

    case 'essay':
      return (
        <Essay
          question={question}
          text={answer?.type === 'essay' ? answer.text : ''}
          onTextChange={noop}
          showResult={true}
          disabled={true}
        />
      );

    case 'drag-and-drop':
      return (
        <DragAndDrop
          question={question}
          placements={answer?.type === 'drag-and-drop' ? answer.placements : {}}
          onPlace={noop}
          showResult={true}
          disabled={true}
        />
      );

    case 'timed-challenge':
      return (
        <ReviewQuestionRenderer
          question={question.innerQuestion}
          answer={answer}
        />
      );

    default:
      return null;
  }
}
