'use client';

import { Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { GameQuizCopy } from '../copy';
import type { GameQuizDraft } from '../types';

interface GameQuizQuestionSidebarProps {
  activeIndex: number;
  copy: GameQuizCopy;
  draft: GameQuizDraft;
  onAddQuestion: () => void;
  onGenerateWithAi: () => void;
  canAddQuestions: boolean;
  onDuplicateQuestion?: (index: number) => void;
  onMoveQuestion?: (fromIndex: number, toIndex: number) => void;
  onRemoveQuestion?: (index: number) => void;
  onSelectIndex: (index: number) => void;
}

export function GameQuizQuestionSidebar({
  activeIndex,
  copy,
  draft,
  onAddQuestion,
  onGenerateWithAi,
  canAddQuestions,
  onSelectIndex,
}: GameQuizQuestionSidebarProps) {
  return (
    <aside className="flex h-fit flex-col rounded-2xl border bg-card p-3 shadow-xs">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between px-2 py-1">
        <div className="flex items-center gap-2">
          <p className="font-bold text-foreground text-sm">
            {copy.editor.question}
          </p>
          <span className="grid size-5 place-items-center rounded-full bg-primary/10 font-bold text-primary text-xs">
            {draft.questions.length}
          </span>
        </div>
        <Button
          type="button"
          aria-label={copy.editor.addQuestion}
          className="size-7"
          disabled={!canAddQuestions}
          onClick={onAddQuestion}
          size="icon"
          variant="ghost"
        >
          <Plus className="size-4" aria-hidden="true" />
        </Button>
      </div>

      {/* Simplified Questions List */}
      <ScrollArea className="max-h-[50dvh] pr-1 xl:max-h-[calc(100vh-14rem)]">
        <div className="space-y-1 py-1">
          {draft.questions.map((question, index) => {
            const isActive = activeIndex === index;

            return (
              <button
                key={question.id}
                type="button"
                className={cn(
                  'flex w-full cursor-pointer items-center rounded-xl px-3.5 py-2.5 text-left text-sm transition-all',
                  isActive
                    ? 'bg-primary font-semibold text-primary-foreground shadow-xs'
                    : 'font-medium text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
                onClick={() => onSelectIndex(index)}
              >
                <span>
                  {copy.editor.question} {index + 1}
                </span>
              </button>
            );
          })}
        </div>
      </ScrollArea>

      {/* Add Question Button */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button
          type="button"
          disabled={!canAddQuestions}
          onClick={onAddQuestion}
          size="sm"
          variant="outline"
        >
          <Plus data-icon="inline-start" aria-hidden="true" />
          {copy.editor.addQuestion}
        </Button>
        <Button
          type="button"
          disabled={!canAddQuestions}
          onClick={onGenerateWithAi}
          size="sm"
          title={!canAddQuestions ? copy.aiGenerate.capacityReached : undefined}
          variant="secondary"
        >
          <Sparkles data-icon="inline-start" aria-hidden="true" />
          {copy.aiGenerate.action}
        </Button>
      </div>
    </aside>
  );
}
