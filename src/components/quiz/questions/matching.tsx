'use client';

import { useRef } from 'react';
import type { MatchingPair } from '@/lib/quiz-template';
import type { DisplaySafe, MatchingQuestion } from '@/lib/quiz-template/types';
import { MatchingQuizView } from './matching-quiz-view';
import { MatchingResultView } from './matching-result-view';

interface MatchingProps {
  question: DisplaySafe<MatchingQuestion>;
  pairs: MatchingPair[];
  onMatch: (pairs: MatchingPair[]) => void;
  showResult?: boolean;
  disabled?: boolean;
}

export function Matching({
  question,
  pairs,
  onMatch,
  showResult = false,
  disabled = false,
}: MatchingProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="space-y-4">
      <p className="font-medium text-base text-foreground leading-relaxed">
        {question.prompt}
      </p>

      {showResult ? (
        <MatchingResultView
          question={question}
          pairs={pairs}
          containerRef={containerRef}
        />
      ) : (
        <MatchingQuizView
          question={question}
          pairs={pairs}
          onMatch={onMatch}
          disabled={disabled}
        />
      )}
    </div>
  );
}
