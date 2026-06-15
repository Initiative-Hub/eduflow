'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { splitEnglishIntoDictionaryTokens } from '@/utils/english-text-tokens';
import { WordDictionaryPopover } from './word-dictionary-popover';

interface ActiveWord {
  word: string;
  anchorElement: HTMLElement;
}

interface DictionaryEnabledTextProps {
  text: string;
  enabled: boolean;
  className?: string;
}

export function DictionaryEnabledText({
  text,
  enabled,
  className,
}: DictionaryEnabledTextProps) {
  const tokens = useMemo(() => splitEnglishIntoDictionaryTokens(text), [text]);
  const [activeWord, setActiveWord] = useState<ActiveWord | null>(null);

  if (!enabled) {
    return <p className={cn('whitespace-pre-wrap', className)}>{text}</p>;
  }

  return (
    <>
      <p className={cn('whitespace-pre-wrap', className)}>
        {tokens.map((token, index) => {
          if (token.type === 'text') {
            return <span key={`${token.text}-${index}`}>{token.text}</span>;
          }

          return (
            <button
              key={`${token.text}-${index}`}
              type="button"
              onClick={(event) =>
                setActiveWord({
                  word: token.lookup,
                  anchorElement: event.currentTarget,
                })
              }
              className="inline cursor-pointer rounded-[2px] text-left align-baseline decoration-primary underline-offset-4 transition-colors hover:text-primary hover:underline focus-visible:text-primary focus-visible:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              {token.text}
            </button>
          );
        })}
      </p>
      <WordDictionaryPopover
        open={Boolean(activeWord)}
        word={activeWord?.word ?? null}
        anchorElement={activeWord?.anchorElement ?? null}
        onOpenChange={(open) => {
          if (!open) setActiveWord(null);
        }}
      />
    </>
  );
}
