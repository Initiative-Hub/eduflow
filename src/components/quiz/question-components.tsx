'use client';

/**
 * Question Component Registry
 *
 * Registers React components for each question type in the registry.
 * Each component adapts the uniform QuestionRendererProps interface
 * to the specific props expected by the underlying question component.
 *
 * Import this module on the client side to ensure all components are registered.
 */

import { getHandler, type QuestionRendererProps } from '@/lib/quiz-template';
import '@/lib/quiz-template/handlers';
import type { MatchingPair } from '@/lib/quiz-template/types';
import {
  DragAndDrop,
  Essay,
  FillInTheBlank,
  Matching,
  MultipleChoice,
  Ordering,
  TrueFalse,
} from './questions';

// ─── Quiz-Taking Components (interactive) ────────────────────────────────────

function MultipleChoiceComponent({
  question,
  answer,
  onAnswer,
  showResult,
  disabled = false,
}: QuestionRendererProps) {
  return (
    <MultipleChoice
      question={question}
      selectedOptionId={
        answer?.type === 'multiple-choice' ? answer.selectedOptionId : undefined
      }
      onSelect={(optionId) =>
        !disabled &&
        onAnswer({ type: 'multiple-choice', selectedOptionId: optionId })
      }
      showResult={showResult}
    />
  );
}

function TrueFalseComponent({
  question,
  answer,
  onAnswer,
  showResult,
  disabled = false,
}: QuestionRendererProps) {
  return (
    <TrueFalse
      question={question}
      selectedAnswer={
        answer?.type === 'true-false' ? answer.selectedAnswer : undefined
      }
      onSelect={(value) =>
        !disabled && onAnswer({ type: 'true-false', selectedAnswer: value })
      }
      showResult={showResult}
    />
  );
}

function FillInTheBlankComponent({
  question,
  answer,
  onAnswer,
  showResult,
  disabled = false,
}: QuestionRendererProps) {
  return (
    <FillInTheBlank
      question={question}
      filledBlanks={
        answer?.type === 'fill-in-the-blank' ? answer.filledBlanks : {}
      }
      onFill={(blankId, value) => {
        if (disabled) return;
        const current =
          answer?.type === 'fill-in-the-blank' ? answer.filledBlanks : {};
        onAnswer({
          type: 'fill-in-the-blank',
          filledBlanks: { ...current, [blankId]: value },
        });
      }}
      showResult={showResult}
    />
  );
}

function MatchingComponent({
  question,
  answer,
  onAnswer,
  showResult,
  disabled = false,
}: QuestionRendererProps) {
  return (
    <Matching
      question={question}
      pairs={answer?.type === 'matching' ? answer.pairs : []}
      onMatch={(pairs: MatchingPair[]) =>
        !disabled && onAnswer({ type: 'matching', pairs })
      }
      showResult={showResult}
    />
  );
}

function OrderingComponent({
  question,
  answer,
  onAnswer,
  showResult,
  disabled = false,
}: QuestionRendererProps) {
  return (
    <Ordering
      question={question}
      orderedItemIds={
        answer?.type === 'ordering'
          ? answer.orderedItemIds
          : question.items.map((item: { id: string }) => item.id)
      }
      onReorder={(orderedItemIds) =>
        !disabled && onAnswer({ type: 'ordering', orderedItemIds })
      }
      showResult={showResult}
    />
  );
}

function EssayComponent({
  question,
  answer,
  onAnswer,
  showResult,
  disabled = false,
}: QuestionRendererProps) {
  return (
    <Essay
      question={question}
      text={answer?.type === 'essay' ? answer.text : ''}
      onTextChange={(text) =>
        !disabled &&
        onAnswer({
          type: 'essay',
          text,
          attachments:
            answer?.type === 'essay' ? answer.attachments : undefined,
          teacherRubricText:
            answer?.type === 'essay' ? answer.teacherRubricText : undefined,
          teacherRubricAttachments:
            answer?.type === 'essay'
              ? answer.teacherRubricAttachments
              : undefined,
        })
      }
      onAttachmentsChange={(attachments: string[]) =>
        !disabled &&
        onAnswer({
          type: 'essay',
          text: answer?.type === 'essay' ? answer.text : '',
          attachments,
          teacherRubricText:
            answer?.type === 'essay' ? answer.teacherRubricText : undefined,
          teacherRubricAttachments:
            answer?.type === 'essay'
              ? answer.teacherRubricAttachments
              : undefined,
        })
      }
      onTeacherRubricTextChange={(teacherRubricText: string) =>
        !disabled &&
        onAnswer({
          type: 'essay',
          text: answer?.type === 'essay' ? answer.text : '',
          attachments:
            answer?.type === 'essay' ? answer.attachments : undefined,
          teacherRubricText,
          teacherRubricAttachments:
            answer?.type === 'essay'
              ? answer.teacherRubricAttachments
              : undefined,
        })
      }
      onTeacherRubricAttachmentsChange={(teacherRubricAttachments: string[]) =>
        !disabled &&
        onAnswer({
          type: 'essay',
          text: answer?.type === 'essay' ? answer.text : '',
          attachments:
            answer?.type === 'essay' ? answer.attachments : undefined,
          teacherRubricText:
            answer?.type === 'essay' ? answer.teacherRubricText : undefined,
          teacherRubricAttachments,
        })
      }
      teacherRubricText={
        answer?.type === 'essay' ? (answer.teacherRubricText ?? '') : ''
      }
      showResult={showResult}
      disabled={disabled}
      showTeacherRubricInput={question.allowTeacherRubric}
    />
  );
}

function DragAndDropComponent({
  question,
  answer,
  onAnswer,
  showResult,
  disabled = false,
}: QuestionRendererProps) {
  return (
    <DragAndDrop
      question={question}
      placements={answer?.type === 'drag-and-drop' ? answer.placements : {}}
      onPlace={(placements) =>
        !disabled && onAnswer({ type: 'drag-and-drop', placements })
      }
      showResult={showResult}
      disabled={disabled}
    />
  );
}

// ─── Review Components (read-only, disabled) ─────────────────────────────────

function MultipleChoiceReview({ question, answer }: QuestionRendererProps) {
  return (
    <MultipleChoice
      question={question}
      selectedOptionId={
        answer?.type === 'multiple-choice' ? answer.selectedOptionId : undefined
      }
      onSelect={() => {}}
      showResult={true}
    />
  );
}

function TrueFalseReview({ question, answer }: QuestionRendererProps) {
  return (
    <TrueFalse
      question={question}
      selectedAnswer={
        answer?.type === 'true-false' ? answer.selectedAnswer : undefined
      }
      onSelect={() => {}}
      showResult={true}
    />
  );
}

function FillInTheBlankReview({ question, answer }: QuestionRendererProps) {
  return (
    <FillInTheBlank
      question={question}
      filledBlanks={
        answer?.type === 'fill-in-the-blank' ? answer.filledBlanks : {}
      }
      onFill={() => {}}
      showResult={true}
    />
  );
}

function MatchingReview({ question, answer }: QuestionRendererProps) {
  return (
    <Matching
      question={question}
      pairs={answer?.type === 'matching' ? answer.pairs : []}
      onMatch={() => {}}
      showResult={true}
      disabled={true}
    />
  );
}

function OrderingReview({ question, answer }: QuestionRendererProps) {
  return (
    <Ordering
      question={question}
      orderedItemIds={
        answer?.type === 'ordering'
          ? answer.orderedItemIds
          : question.items.map((item: { id: string }) => item.id)
      }
      onReorder={() => {}}
      showResult={true}
      disabled={true}
    />
  );
}

function EssayReview({ question, answer }: QuestionRendererProps) {
  return (
    <Essay
      question={question}
      text={answer?.type === 'essay' ? answer.text : ''}
      onTextChange={() => {}}
      showResult={true}
      disabled={true}
    />
  );
}

function DragAndDropReview({ question, answer }: QuestionRendererProps) {
  return (
    <DragAndDrop
      question={question}
      placements={answer?.type === 'drag-and-drop' ? answer.placements : {}}
      onPlace={() => {}}
      showResult={true}
      disabled={true}
    />
  );
}

// ─── Register Components in the Registry ─────────────────────────────────────

/**
 * Registers all question type components (quiz-taking and review) in the registry.
 * Call this function once on the client side to populate the component fields.
 */
export function registerQuestionComponents(): void {
  const types = [
    {
      type: 'multiple-choice',
      component: MultipleChoiceComponent,
      reviewComponent: MultipleChoiceReview,
    },
    {
      type: 'true-false',
      component: TrueFalseComponent,
      reviewComponent: TrueFalseReview,
    },
    {
      type: 'fill-in-the-blank',
      component: FillInTheBlankComponent,
      reviewComponent: FillInTheBlankReview,
    },
    {
      type: 'matching',
      component: MatchingComponent,
      reviewComponent: MatchingReview,
    },
    {
      type: 'ordering',
      component: OrderingComponent,
      reviewComponent: OrderingReview,
    },
    {
      type: 'drag-and-drop',
      component: DragAndDropComponent,
      reviewComponent: DragAndDropReview,
    },
    {
      type: 'essay',
      component: EssayComponent,
      reviewComponent: EssayReview,
    },
  ] as const;

  for (const { type, component, reviewComponent } of types) {
    const handler = getHandler(type);
    handler.component = component;
    handler.reviewComponent = reviewComponent;
  }
}

// Auto-register on import
registerQuestionComponents();
