'use client';

import type { ClientQuizContent } from '@/lib/quiz-template/client-types';
import type {
  MatchingPair,
  QuizContent,
  StudentAnswer,
} from '@/lib/quiz-template/types';
import {
  DragAndDrop,
  Essay,
  FillInTheBlank,
  Matching,
  MultipleChoice,
  Ordering,
  TrueFalse,
} from './questions';

// ─── Question Renderer ─────────────────────────────────────────────────────────

export type AnyQuestionBlock = (
  | ClientQuizContent
  | QuizContent
)['questions'][number];

interface QuestionRendererProps {
  question: AnyQuestionBlock;
  answer?: StudentAnswer;
  onAnswer: (answer: StudentAnswer) => void;
  showResult: boolean;
  disabled?: boolean;
}

export function QuestionRenderer({
  question,
  answer,
  onAnswer,
  showResult,
  disabled = false,
}: QuestionRendererProps) {
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
          onSelect={(optionId) =>
            !disabled &&
            onAnswer({ type: 'multiple-choice', selectedOptionId: optionId })
          }
          showResult={showResult}
        />
      );

    case 'true-false':
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

    case 'fill-in-the-blank':
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

    case 'matching':
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

    case 'ordering':
      return (
        <Ordering
          question={question}
          orderedItemIds={
            answer?.type === 'ordering'
              ? answer.orderedItemIds
              : question.items.map((item) => item.id)
          }
          onReorder={(orderedItemIds) =>
            !disabled && onAnswer({ type: 'ordering', orderedItemIds })
          }
          showResult={showResult}
        />
      );

    case 'essay':
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
          onTeacherRubricAttachmentsChange={(
            teacherRubricAttachments: string[]
          ) =>
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

    case 'drag-and-drop':
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

    case 'timed-challenge':
      return (
        <QuestionRenderer
          question={question.innerQuestion}
          answer={answer}
          onAnswer={onAnswer}
          showResult={showResult}
          disabled={disabled}
        />
      );

    default:
      return null;
  }
}
