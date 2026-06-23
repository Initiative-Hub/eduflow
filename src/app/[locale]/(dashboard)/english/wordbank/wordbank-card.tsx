'use client';

import { Loader2, Volume2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type {
  SavedVocabularyItem,
  VocabularyListSummary,
} from '@/services/english/SavedVocabularyService';
import { PracticeReveal } from './practice-reveal';
import { playWordbankAudio } from './wordbank-audio';
import {
  WordbankListManager,
  type WordbankListUpdate,
} from './wordbank-list-manager';
import { MasteryBadge, type WordbankTranslator } from './wordbank-mastery';

export function WordbankCard({
  item,
  isRemoving,
  isUpdating,
  practiceMode,
  lists,
  onRemoveWord,
  onUpdateLists,
  t,
}: {
  item: SavedVocabularyItem;
  isRemoving: boolean;
  isUpdating: boolean;
  practiceMode: boolean;
  lists: VocabularyListSummary[];
  onRemoveWord: (word: string) => void;
  onUpdateLists: (vocabularyIds: string[], update: WordbankListUpdate) => void;
  t: WordbankTranslator;
}) {
  const itemListIds = new Set(item.lists.map((list) => list.id));

  return (
    <Card className="min-h-80 rounded-xl">
      <CardHeader>
        <CardTitle className="flex flex-col gap-2">
          <span className="wrap-break-word text-2xl text-primary">
            {item.word}
          </span>
          <MasteryBadge level={item.masteryLevel} t={t} />
        </CardTitle>
        <CardAction className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => item.audioUrl && playWordbankAudio(item.audioUrl)}
            disabled={!item.audioUrl}
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-all hover:bg-primary hover:text-primary-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
            aria-label={t('playPronunciation', { word: item.word })}
          >
            <Volume2 className="size-4" />
          </button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={isRemoving}
            onClick={() => onRemoveWord(item.word)}
            aria-label={t('removeWord', { word: item.word })}
          >
            {isRemoving ? <Loader2 className="animate-spin" /> : <X />}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="font-mono text-base text-muted-foreground">
          {item.ipa ?? t('missingIpa')}
        </p>
        <div className="flex flex-col gap-2">
          <PracticeReveal enabled={practiceMode} label={t('revealAnswer')}>
            <p className="text-base text-foreground leading-relaxed">
              {item.englishDefinition}
            </p>
          </PracticeReveal>
          <PracticeReveal enabled={practiceMode} label={t('revealAnswer')}>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {item.vietnameseTranslation}
            </p>
          </PracticeReveal>
        </div>
        <blockquote className="mb-1 border-primary/30 border-l-2 pl-4 text-base text-muted-foreground leading-relaxed">
          &ldquo;{item.exampleSentence}&rdquo;
        </blockquote>
        <div className="flex flex-wrap items-center gap-2">
          {item.lists.map((list) => (
            <Badge key={list.id} variant="outline" className="gap-1 pr-1">
              {list.name}
              <button
                type="button"
                className="rounded-full text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
                disabled={isUpdating}
                onClick={() =>
                  onUpdateLists([item.id], { removeListIds: [list.id] })
                }
                aria-label={t('removeFromList', { list: list.name })}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
          <WordbankListManager
            vocabularyIds={[item.id]}
            lists={lists}
            disabled={isUpdating}
            getMembership={(listId) => itemListIds.has(listId)}
            onUpdateLists={onUpdateLists}
            t={t}
          />
        </div>
      </CardContent>
    </Card>
  );
}
