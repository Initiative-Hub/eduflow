'use client';

import { getHandler } from '@/lib/quiz-template';
import type { QuizContent, StudentAnswer } from '@/lib/quiz-template/types';

// Ensure question components are registered
import './question-components';

// ─── Review Question Renderer (read-only, shows results) ─────────────────────

interface ReviewQuestionRendererProps {
  question: QuizContent['questions'][number];
  answer?: StudentAnswer;
}

export function ReviewQuestionRenderer({
  question,
  answer,
}: ReviewQuestionRendererProps) {
  // Handle timed-challenge by rendering its inner question
  if (question.type === 'timed-challenge') {
    return (
      <ReviewQuestionRenderer
        question={question.innerQuestion}
        answer={answer}
      />
    );
  }

  const handler = getHandler(question.type);
  const ReviewComponent = handler.reviewComponent;

  if (!ReviewComponent) {
    return null;
  }

  const noop = () => {};

  return (
    <ReviewComponent
      question={question}
      answer={answer}
      onAnswer={noop}
      showResult={true}
      disabled={true}
    />
  );
}
