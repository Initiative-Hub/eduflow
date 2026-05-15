'use client';

import { getHandler } from '@/lib/quiz-template';
import type {
  ClientQuizContent,
  QuizContent,
  StudentAnswer,
} from '@/lib/quiz-template/types';

// Ensure question components are registered
import './question-components';

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
  // Handle timed-challenge by rendering its inner question
  if (question.type === 'timed-challenge') {
    return (
      <QuestionRenderer
        question={question.innerQuestion}
        answer={answer}
        onAnswer={onAnswer}
        showResult={showResult}
        disabled={disabled}
      />
    );
  }

  const handler = getHandler(question.type);
  const Component = handler.component;

  if (!Component) {
    return null;
  }

  return (
    <Component
      question={question}
      answer={answer}
      onAnswer={onAnswer}
      showResult={showResult}
      disabled={disabled}
    />
  );
}
